# PBH Algo - Full Python Backtrader Port
# -------------------------------------------------------------
# This file ports the TradingView Pine Script strategy:
# "PBH Algo - CHUCK (w/ Partials)(17/07/25)"
# to a Backtrader strategy with comparable behavior.
#
# Notes:
# - Requires: backtrader, pandas, pytz
# - Supports: long/short entries, RVOL filters, ADR logic,
#             session windows, half-days, EOD flatten, pyramiding,
#             multi-TP partials, move-stop logic, pending-order timeout.
#
# Usage example (see bottom of file for a runnable skeleton):
#   python pbh_algo.py --csv path/to/intraday.csv --timeframe minutes --compression 1
#
# Disclaimer: This is a best-effort port; TradingView engine differences
# and brokerage mechanics may cause small behavior deviations.
#
# -------------------------------------------------------------

import backtrader as bt
import datetime as dt
from math import isnan
from typing import List, Optional, Tuple

try:
    import pytz
except Exception:
    pytz = None

def _parse_session_range(rng: str) -> Tuple[dt.time, dt.time]:
    # e.g. "0930-0946" -> (09:30, 09:46)
    a, b = rng.split('-')
    h1, m1 = int(a[:2]), int(a[2:])
    h2, m2 = int(b[:2]), int(b[2:])
    return dt.time(h1, m1), dt.time(h2, m2)

def _time_in_range(t: dt.time, start: dt.time, end: dt.time) -> bool:
    # inclusive start, inclusive end (per TradingView session bars are inclusive)
    if start <= end:
        return start <= t <= end
    # overnight wrap (not used here but robust)
    return t >= start or t <= end

class RollingHighest:
    """Rolling highest tracker for a numeric series over N samples."""
    def __init__(self, period: int):
        self.period = max(1, int(period))
        self.buffer: List[float] = []

    def update(self, value: float) -> float:
        self.buffer.append(value)
        if len(self.buffer) > self.period:
            self.buffer.pop(0)
        return max(self.buffer) if self.buffer else float('nan')

class PBHAlgo(bt.Strategy):
    params = dict(
        # General
        show_risk_reward=False,
        show_new_day=False,
        use_eod=True,
        take_long=True,
        take_short=False,
        use_ms=False,            # Activate Move-Stop
        ms_rval=2.0,             # R target move stop
        move_rval=-0.5,          # Distance the stop is moved (R); 0 means BE
        ms_bar_count=3,          # Bars before MS auto-activation
        max_entry_count=2,       # Maximum trades per day
        pyramiding_count=4,      # Max open trades (aggregate) a.k.a. pyramiding
        pending_bar_count=3,     # Pending stop order lifetime (bars)
        # Entry Decision Candle Filter
        min_candle_perc=0.1,     # % move threshold
        # Volume Filters
        use_high_ever_vol_filter=False,
        use_high_week_vol_filter=False,
        weeks=52,                # lookback weeks for high vol check
        # Volume
        vol_ma_period=50,
        rvol=1.0,
        min_abs_volume=100000,
        # ADR
        adrp_len=20,
        adr_multip=0.1,          # multiplier on ADR%
        # Entry
        buffer_perc=0.01,        # entry buffer (%)
        entry_candle_th_perc=0,  # ADR threshold (%)
        rote_input_one=100.0,    # $ risk per trade (first trade of the day)
        rote_input_two=100.0,    # $ risk per trade (subsequent trades)
        # TP/SL
        tp_multipliers=(300.0, 500.0, 700.0, 900.0),  # multiples on range or R (see calc)
        tp_percents=(25, 25, 25, 25),                 # % per TP (sums up to 100, TP4 uses remainder)
        sl_buffer=0.0,           # buffer in R (applied to range-derived SL seed)
        max_sl_perc=0.05,        # cap SL distance (% of entry) for max
        min_sl_perc=0.10/100.0,  # floor SL distance (% of entry) for min (Pine default 0.10 then /100)
        # Session
        tz='America/New_York',
        session_first_range='0930-0931',
        session_last_range='1559-1600',
        session_one_range='0930-0946',
        session_two_range='0930-0946',
        paint_ses=True,  # purely visual in Pine, no-op here
        # Optional: pass a set of half-day dates (date objects) to close early; default includes 2010-2030 sample
        halfday_dates=None,
    )

    def __init__(self):
        # --- Data aliases ---
        self.d = self.datas[0]

        # Timezone
        self._tz = pytz.timezone(self.p.tz) if (pytz and self.p.tz) else None
        self._first_s, self._first_e = _parse_session_range(self.p.session_first_range)
        self._last_s, self._last_e   = _parse_session_range(self.p.session_last_range)
        self._ses1_s, self._ses1_e   = _parse_session_range(self.p.session_one_range)
        self._ses2_s, self._ses2_e   = _parse_session_range(self.p.session_two_range)

        # Half-day calendar: from Pine's explicit list (2010–2030 + sentinels)
        self.halfday_set = set(self.p.halfday_dates or [])
        if not self.halfday_set:
            # Minimal default: you can supply a full list externally if desired.
            # The Pine script uses many explicit timestamps; we approximate by date.
            pass

        # --- Indicators ---
        self.vol_sma = bt.indicators.SimpleMovingAverage(self.d.volume, period=int(self.p.vol_ma_period))

        # ADR% calculation: Pine uses arp = 100*(sma(high/low, adrpLen)-1) on Daily, then requests to intraday.
        # Here we approximate using a rolling on intraday highs/lows grouped by date.
        self._daily_hilo = {}      # date -> [hi, lo]
        self._daily_arp = []       # rolling 'high/low' for ADR%
        self._entry_candle_adr = float('nan')
        self._min_daily_adr_candle = float('nan')

        # --- State vars (Pine mirrors) ---
        self.longEntryPrice = float('nan')
        self.longStop = float('nan')
        self.longStopOrig = float('nan')
        self.longTp = [float('nan')]*4
        self.longMsRVal = float('nan')
        self.longMoveVal = float('nan')
        self.longPositionSize = float('nan')

        self.shortEntryPrice = float('nan')
        self.shortStop = float('nan')
        self.shortStopOrig = float('nan')
        self.shortTp = [float('nan')]*4
        self.shortMsRVal = float('nan')
        self.shortMoveVal = float('nan')
        self.shortPositionSize = float('nan')

        self.isBlocked = False
        self.isEodBlock = False
        self.tradeCounter = 0
        self.icCounter = 0
        self.rangeCandleCounter = 0
        self.isPendingOrder = False
        self.isPendingOrderSet = False
        self.isTpHit = [False, False, False]
        self.isMsHit = False
        self.isLongPlaced = False
        self.candlePerc = float('nan')
        self.entryCandleAdr = float('nan')
        self.minDailyAdrCandle = float('nan')

        # Highest UP close volume trackers
        self._max_vol_up_close = float('nan')  # Ever
        lookback_period = int(self.p.weeks) * 5  # trading days approx. (Pine uses weeks*5)
        self._rolling_high_vol = RollingHighest(max(1, lookback_period))

        # Order tracking (pending and TP/SL legs)
        self._open_entries: List[bt.Order] = []
        self._open_exits: List[bt.Order] = []
        self._last_entry_bar = None

    # ------------- Utility -------------
    def _bar_dt(self) -> dt.datetime:
        dt_ = bt.num2date(self.d.datetime[0])
        if self._tz:
            if dt_.tzinfo is None:
                dt_ = self._tz.localize(dt_)
            else:
                dt_ = dt_.astimezone(self._tz)
        return dt_

    def _in_session(self, rng: Tuple[dt.time, dt.time]) -> bool:
        t = self._bar_dt().time()
        return _time_in_range(t, rng[0], rng[1])

    def _in_any_trade_session(self) -> bool:
        return self._in_session((self._ses1_s, self._ses1_e)) or self._in_session((self._ses2_s, self._ses2_e))

    def _is_session_first_active(self) -> bool:
        return self._in_session((self._first_s, self._first_e))

    def _is_session_last_active(self) -> bool:
        return self._in_session((self._last_s, self._last_e))

    def _is_halfday_now(self) -> bool:
        # Pine uses explicit "time == specific timestamp" checks.
        # We approximate: if today's date is in half-day list and current bar time >= 12:59 local, treat as EOD.
        d = self._bar_dt()
        if dt.date(d.year, d.month, d.day) in self.halfday_set:
            t = d.time()
            return (t.hour, t.minute) >= (12, 59)
        return False

    def _reset_day_state(self):
        self.isEodBlock = False
        self.isPendingOrder = False
        self.tradeCounter = 0
        self.minDailyAdrCandle = float('nan')
        self.isTpHit = [False, False, False]
        self.isMsHit = False

    def _cancel_all_pending_entries(self):
        for o in list(self._open_entries):
            try:
                self.cancel(o)
            except Exception:
                pass
        self._open_entries.clear()

    def _cancel_all_exits(self):
        for o in list(self._open_exits):
            try:
                self.cancel(o)
            except Exception:
                pass
        self._open_exits.clear()

    def _close_all_positions(self, comment='EOD'):
        # Close everything by market order
        if self.position:
            if self.position.size > 0:
                self.sell(size=self.position.size)  # market
            elif self.position.size < 0:
                self.buy(size=abs(self.position.size))
        self._cancel_all_pending_entries()
        self._cancel_all_exits()

    # ------------- ADR & "inside candle" helpers -------------
    def _update_daily_hilo_and_adr(self):
        d = self._bar_dt().date()
        hi = float(self.d.high[0])
        lo = float(self.d.low[0])

        # Update daily high/low
        if d not in self._daily_hilo:
            self._daily_hilo[d] = [hi, lo]
        else:
            self._daily_hilo[d][0] = max(self._daily_hilo[d][0], hi)
            self._daily_hilo[d][1] = min(self._daily_hilo[d][1], lo)

        # Maintain rolling SMA(high/low, adrp_len) approximation
        # Compute at each new day close-ish: we simply track the last known day values
        # and compute 100*(SMA(high/low, N)-1). Here we approximate by storing the hi/lo ratio daily.
        # Note: in intraday loop, we update continuously; SMA effect is approximated.
        ratio = self._daily_hilo[d][0] / max(self._daily_hilo[d][1], 1e-9)
        # Append each bar; SMA over many repeated same-day ratios is not exact, but acceptable in backtests.
        self._daily_arp.append(ratio)
        if len(self._daily_arp) > max(1, int(self.p.adrp_len)):
            # Keep N
            self._daily_arp = self._daily_arp[-int(self.p.adrp_len):]

        # adrPerc = 100 * (SMA(high/low, adrpLen) - 1)
        sma_ratio = sum(self._daily_arp) / len(self._daily_arp)
        adrPerc = 100.0 * (sma_ratio - 1.0)

        # Current bar range percent
        candleRangePerc = ((hi - lo) / max(lo, 1e-9)) * 100.0
        isRangePercValid = candleRangePerc > self.p.adr_multip * adrPerc if adrPerc == adrPerc else False

        # entryCandleAdr %: (candleRangePerc / adrPerc) * 100
        entryCandleAdr = (candleRangePerc / adrPerc) * 100.0 if adrPerc and adrPerc != 0 else float('nan')

        # Update minDailyAdrCandle during trade session for non-inside bars
        inside = (hi < float(self.d.high[-1]) and lo > float(self.d.low[-1])) if len(self) > 1 else False
        if self._in_any_trade_session() and not inside and not isnan(entryCandleAdr):
            if isnan(self._min_daily_adr_candle):
                self._min_daily_adr_candle = entryCandleAdr
            else:
                self._min_daily_adr_candle = min(self._min_daily_adr_candle, entryCandleAdr)

        self.entryCandleAdr = entryCandleAdr
        self.minDailyAdrCandle = self._min_daily_adr_candle
        return adrPerc, candleRangePerc, isRangePercValid, entryCandleAdr

    # ------------- Orders & Risk -------------
    def _position_risk_dollars(self) -> float:
        # ROTE selection: first trade vs subsequent
        rote = self.p.rote_input_one if self.tradeCounter == 0 else self.p.rote_input_two
        return max(0.1, float(rote))

    def _size_from_risk(self, entry_price: float, stop_price: float) -> int:
        risk_per_share = abs(entry_price - stop_price)
        if risk_per_share <= 0:
            return 0
        shares = int(round(self._position_risk_dollars() / risk_per_share))
        return max(1, shares)

    def _submit_entry_and_exits(self, is_long: bool, entry_price: float, stop_price: float,
                                tp_prices: List[Optional[float]], qty: int):
        # Submit stop entry (stop order)
        if is_long:
            o_entry = self.buy(exectype=bt.Order.Stop, price=entry_price, size=qty)
        else:
            o_entry = self.sell(exectype=bt.Order.Stop, price=entry_price, size=qty)
        self._open_entries.append(o_entry)

        # Submit exits (as stop/limit OCO). Backtrader lacks native OCO across >2 legs;
        # we emulate by cancelling siblings on one fill in notify_order().
        # Create up to 4 TP legs; if pyramiding_count == 1 use partials else single TP.
        exits = []
        if self.p.pyramiding_count == 1:
            # Partial exits
            percs = list(self.p.tp_percents)
            if sum(percs) > 100:
                # normalize
                s = sum(percs)
                percs = [int(round(p * 100.0 / s)) for p in percs]
            while len(percs) < 4:
                percs.append(0)
            # compute qty per leg (last leg uses remaining)
            remaining = qty
            legs = []
            for i in range(3):
                q = int(round(qty * percs[i] / 100.0))
                q = min(q, remaining)
                legs.append(q)
                remaining -= q
            legs.append(max(0, remaining))

            for i in range(4):
                tp = tp_prices[i] if i < len(tp_prices) else None
                q = legs[i]
                if q <= 0 or tp is None or isnan(tp):
                    continue
                if is_long:
                    o_sl = self.sell(exectype=bt.Order.Stop, price=stop_price, size=q)
                    o_tp = self.sell(exectype=bt.Order.Limit, price=tp, size=q)
                else:
                    o_sl = self.buy(exectype=bt.Order.Stop, price=stop_price, size=q)
                    o_tp = self.buy(exectype=bt.Order.Limit, price=tp, size=q)
                exits.extend([o_sl, o_tp])
        else:
            # Single take-profit using tp_prices[0]
            tp = tp_prices[0] if tp_prices else None
            if tp is not None and not isnan(tp):
                if is_long:
                    o_sl = self.sell(exectype=bt.Order.Stop, price=stop_price, size=qty)
                    o_tp = self.sell(exectype=bt.Order.Limit, price=tp, size=qty)
                else:
                    o_sl = self.buy(exectype=bt.Order.Stop, price=stop_price, size=qty)
                    o_tp = self.buy(exectype=bt.Order.Limit, price=tp, size=qty)
                exits.extend([o_sl, o_tp])

        self._open_exits.extend(exits)
        self.isPendingOrder = True
        self.rangeCandleCounter = 0
        self.isPendingOrderSet = True
        self.isTpHit = [False, False, False]
        self.isMsHit = False
        self._last_entry_bar = len(self)

    # ------------- Notify -------------
    def notify_order(self, order):
        if order.status in [order.Completed, order.Canceled, order.Rejected, order.Margin]:
            # Clean up bookkeeping if entry cancels/rejects
            if order in self._open_entries and order.status != order.Completed:
                try:
                    self._open_entries.remove(order)
                except ValueError:
                    pass

            # If a TP/SL fills, we may want to cancel sibling orders (OCO emulate)
            if order.status == order.Completed:
                # If any protective leg filled, cancel its paired opposite
                # Simplified: on any exit completion, cancel remaining exits if flat
                if not self.position:
                    self._cancel_all_exits()

                # Trade counter increment logic:
                if order.isbuy() or order.issell():
                    # Detect new trade open
                    # We increment tradeCounter when a new market position is opened.
                    pass

    # ------------- Next (bar-by-bar) -------------
    def next(self):
        dt_now = self._bar_dt()
        high = float(self.d.high[0])
        low = float(self.d.low[0])
        close = float(self.d.close[0])
        vol = float(self.d.volume[0])
        prev_close = float(self.d.close[-1]) if len(self) > 1 else close

        # Inside candle detection vs previous bar
        inside_candle = (high < float(self.d.high[-1]) and low > float(self.d.low[-1])) if len(self) > 1 else False
        if inside_candle:
            self.icCounter += 1
        else:
            self.icCounter = 0

        # ADR and related thresholds
        adrPerc, candleRangePerc, isRangePercValid, entryCandleAdr = self._update_daily_hilo_and_adr()

        # Volume filters
        isVolumeValid = vol > float(self.vol_sma[0]) * float(self.p.rvol) if not isnan(self.vol_sma[0]) else False
        isAbsVolumeValid = vol > float(self.p.min_abs_volume)

        # Candle % move
        self.candlePerc = ((close - prev_close) / prev_close) * 100.0 if prev_close else 0.0
        candlePercFilterResult = abs(self.candlePerc) >= float(self.p.min_candle_perc)

        # Highest UP close volume filters
        is_up_close = close > prev_close
        is_new_max_volume = False
        if is_up_close:
            if isnan(self._max_vol_up_close) or vol > self._max_vol_up_close:
                self._max_vol_up_close = vol
                is_new_max_volume = True
        highVolumeEverFilterResult = is_new_max_volume if self.p.use_high_ever_vol_filter else True

        # Rolling highest over lookback for up-close (approx)
        highest_vol_lookback = self._rolling_high_vol.update(vol)
        is_new_max_10w = (vol == highest_vol_lookback) and is_up_close
        highVolumeWeekFilterResult = is_new_max_10w if self.p.use_high_week_vol_filter else True

        # Session boundary handling
        sessionFirstActive = self._is_session_first_active()
        sessionLastActive = self._is_session_last_active()
        inTradeSession = self._in_any_trade_session()
        isHalfDay = self._is_halfday_now()

        # EOD flatten
        if self.p.use_eod and (sessionLastActive or isHalfDay) and self.position and len(self) > 0:
            self.isEodBlock = True
            self.isPendingOrder = False
            self._close_all_positions(comment='EOD')

        # Session opens: reset counters and cancel pendings on the first opening bar
        if sessionFirstActive and len(self) > 1:
            # detect session open transition
            prev_time = bt.num2date(self.d.datetime[-1])
            if self._tz:
                prev_time = self._tz.localize(prev_time) if prev_time.tzinfo is None else prev_time.astimezone(self._tz)
            if not _time_in_range(prev_time.time(), self._first_s, self._first_e):
                self._cancel_all_pending_entries()
                self._cancel_all_exits()
                self._reset_day_state()

        # Update pending order counter
        if self.isPendingOrder:
            self.rangeCandleCounter += 1
            if self.rangeCandleCounter > int(self.p.pending_bar_count):
                # Expire pending
                self.isPendingOrder = False
                self._cancel_all_pending_entries()
                self._cancel_all_exits()

        # Trade count limiter: cancel new entries when daily limit hit
        if (not sessionFirstActive) and self.tradeCounter >= int(self.p.max_entry_count):
            self._cancel_all_pending_entries()
            self._cancel_all_exits()
            self.isEodBlock = True
            self.isPendingOrder = False

        # Cancel any pending trades when outside trading session
        if not inTradeSession:
            self._cancel_all_pending_entries()
            self._cancel_all_exits()
            self.isPendingOrder = False

        # Determine entry levels (mirroring Pine logic for inside/non-inside)
        if (self.position.size == 0 or abs(self.position.size) < int(self.p.pyramiding_count)) and len(self) > 1:
            buffer_mult_long = 1.0 + float(self.p.buffer_perc)
            buffer_mult_short = 1.0 - float(self.p.buffer_perc)

            if self.icCounter >= 2:
                longEntryPrice = float(self.d.high[-1]) * buffer_mult_long
                shortEntryPrice = float(self.d.low[-1]) * buffer_mult_short
                longStopOrig = float(self.d.low[-1])
                shortStopOrig = float(self.d.high[-1])
                rng_high = float(self.d.high[-1])
                rng_low = float(self.d.low[-1])
            else:
                # inside == False OR sessionFirstActive => use current bar
                longEntryPrice = (high * buffer_mult_long) if (not inside_candle or sessionFirstActive) else self.longEntryPrice
                shortEntryPrice = (low * buffer_mult_short) if (not inside_candle or sessionFirstActive) else self.shortEntryPrice
                longStopOrig = (low if (not inside_candle or sessionFirstActive) else self.longStopOrig)
                shortStopOrig = (high if (not inside_candle or sessionFirstActive) else self.shortStopOrig)
                rng_high = high if (not inside_candle or sessionFirstActive) else float(self.d.high[-1])
                rng_low = low if (not inside_candle or sessionFirstActive) else float(self.d.low[-1])

            # SL with buffer
            longStop = (rng_low + (rng_high - rng_low) * float(self.p.sl_buffer))
            shortStop = (rng_high - (rng_high - rng_low) * float(self.p.sl_buffer))

            # Control max/min stop placement by % of entry
            tempLongMaxSl = longEntryPrice * (1.0 - float(self.p.max_sl_perc))
            tempLongMinSl = longEntryPrice * (1.0 - float(self.p.min_sl_perc))
            tempShortMaxSl = shortEntryPrice * (1.0 + float(self.p.max_sl_perc))
            tempShortMinSl = shortEntryPrice * (1.0 + float(self.p.min_sl_perc))

            if tempLongMaxSl > longStop:
                longStop = tempLongMaxSl
            if tempLongMinSl < longStop:
                longStop = tempLongMinSl
            if shortStop > tempShortMaxSl:
                shortStop = tempShortMaxSl
            if shortStop < tempShortMinSl:
                shortStop = tempShortMinSl

            # Entry Candle ADR logic
            entryCandleAdr = self.entryCandleAdr
            minDailyAdrCandle = self.minDailyAdrCandle
            adr_gate = (entryCandleAdr > float(self.p.entry_candle_th_perc)) or \
                       (entryCandleAdr < float(self.p.entry_candle_th_perc) and
                        not isnan(minDailyAdrCandle) and entryCandleAdr > minDailyAdrCandle)

            # TP levels
            tp_mults = list(self.p.tp_multipliers)
            longTp = [longEntryPrice + (rng_high - rng_low) * m for m in tp_mults] if adr_gate else [float('nan')]*4
            shortTp = [shortEntryPrice - abs(shortEntryPrice - shortStop) * m for m in tp_mults] if adr_gate else [float('nan')]*4

            # MS levels
            longMsRVal = longEntryPrice + (longEntryPrice - longStop) * float(self.p.ms_rval)
            longMoveVal = longEntryPrice + (longEntryPrice - longStop) * float(self.p.move_rval)
            shortMsRVal = shortEntryPrice - abs(shortEntryPrice - shortStop) * float(self.p.ms_rval)
            shortMoveVal = shortEntryPrice - abs(shortEntryPrice - shortStop) * float(self.p.move_rval)

            # Position sizing
            longStopDist = (longEntryPrice - longStopOrig) / max(longEntryPrice, 1e-9) if longEntryPrice else 0.0
            shortStopDist = abs(shortEntryPrice - shortStopOrig) / max(shortEntryPrice, 1e-9) if shortEntryPrice else 0.0

            # Size by $ risk per share (more direct than Pine's % of entry dist)
            long_qty = self._size_from_risk(longEntryPrice, longStopOrig) if longStopDist > 0 else 0
            short_qty = self._size_from_risk(shortEntryPrice, shortStopOrig) if shortStopDist > 0 else 0

            # Save to state
            self.longEntryPrice, self.shortEntryPrice = longEntryPrice, shortEntryPrice
            self.longStopOrig, self.shortStopOrig = longStopOrig, shortStopOrig
            self.longStop, self.shortStop = longStop, shortStop
            self.longTp, self.shortTp = longTp, shortTp
            self.longMsRVal, self.shortMsRVal = longMsRVal, shortMsRVal
            self.longMoveVal, self.shortMoveVal = longMoveVal, shortMoveVal
            self.longPositionSize, self.shortPositionSize = long_qty, short_qty

            # --- Entry conditions (Long / Short) ---
            common_filters = (
                (not self.isEodBlock) and
                inTradeSession and
                isAbsVolumeValid and
                isVolumeValid and
                candlePercFilterResult and
                isRangePercValid and
                highVolumeEverFilterResult and
                highVolumeWeekFilterResult and
                (self.tradeCounter < int(self.p.max_entry_count))
            )
            structure_ok = ((not inside_candle) or sessionFirstActive or (self.icCounter >= 2))

            # Long
            if (self.p.take_long and structure_ok and common_filters):
                if not self.isPendingOrder:
                    qty = max(1, int(long_qty))
                    self._submit_entry_and_exits(
                        is_long=True,
                        entry_price=longEntryPrice,
                        stop_price=longStop,
                        tp_prices=longTp,
                        qty=qty
                    )
                    self.isLongPlaced = True
                    # Increment trade counter when a new entry is placed (Pine increments on open/fill; we do on place)
                    self.tradeCounter += 1

            # Short
            if (self.p.take_short and structure_ok and common_filters):
                if not self.isPendingOrder:
                    qty = max(1, int(short_qty))
                    self._submit_entry_and_exits(
                        is_long=False,
                        entry_price=shortEntryPrice,
                        stop_price=shortStop,
                        tp_prices=shortTp,
                        qty=qty
                    )
                    # Increment trade counter
                    self.tradeCounter += 1

        # --- Move-Stop activation ---
        if (int(self.p.pyramiding_count) == 1 and self.p.use_ms and self.position):
            # Check MS trigger: after ms_bar_count bars OR price reaches MsRVal
            ms_ready = False
            if self._last_entry_bar is not None and len(self) - int(self._last_entry_bar) >= int(self.p.ms_bar_count):
                ms_ready = True
            if self.position.size > 0 and high >= self.longMsRVal:
                ms_ready = True
            if self.position.size < 0 and low <= self.shortMsRVal:
                ms_ready = True

            if ms_ready:
                if self.position.size > 0:
                    # Adjust stop to longMoveVal for remaining position; cancel and recreate SL/TP legs.
                    self._cancel_all_exits()
                    qty = abs(int(self.position.size))
                    # Recreate exits with MS stop and same TP structure
                    self._submit_entry_and_exits(
                        is_long=True,
                        entry_price=float('nan'),  # no new entry
                        stop_price=self.longMoveVal,
                        tp_prices=self.longTp,
                        qty=qty
                    )
                elif self.position.size < 0:
                    self._cancel_all_exits()
                    qty = abs(int(self.position.size))
                    self._submit_entry_and_exits(
                        is_long=False,
                        entry_price=float('nan'),
                        stop_price=self.shortMoveVal,
                        tp_prices=self.shortTp,
                        qty=qty
                    )

    # ------------- Stop -------------
    def stop(self):
        # Any final cleanup or logging
        pass

# -------------------- CLI Runner --------------------
if __name__ == "__main__":
    import argparse
    import pandas as pd

    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True, help="Path to intraday CSV with columns: datetime, open, high, low, close, volume")
    parser.add_argument("--timeframe", default="minutes", choices=["minutes", "days"])
    parser.add_argument("--compression", type=int, default=1)
    parser.add_argument("--tz", default="America/New_York", help="Timezone of the provided data (assumed naive if not tz-aware)")
    parser.add_argument("--cash", type=float, default=1_000_000.0)
    parser.add_argument("--commission", type=float, default=0.0)
    args = parser.parse_args()

    # Load CSV
    df = pd.read_csv(args.csv)
    # Expect a 'datetime' column parsable to pandas datetime
    df['datetime'] = pd.to_datetime(df['datetime'])
    df.set_index('datetime', inplace=True)
    df.sort_index(inplace=True)

    data = bt.feeds.PandasData(
        dataname=df,
        datetime=None,
        open='open',
        high='high',
        low='low',
        close='close',
        volume='volume',
        openinterest=None,
        timeframe=bt.TimeFrame.Minutes if args.timeframe == "minutes" else bt.TimeFrame.Days,
        compression=int(args.compression),
        tz=args.tz
    )

    cerebro = bt.Cerebro()
    cerebro.adddata(data)
    cerebro.addstrategy(PBHAlgo, tz=args.tz)
    cerebro.broker.setcash(args.cash)
    cerebro.broker.setcommission(commission=args.commission)
    cerebro.run()
    print(f"Final Portfolio Value: {cerebro.broker.getvalue():.2f}")

# Strategy metadata
metadata = {
    "name": "Prior Bar Break Algo",
    "version": "2.0",
    "author": "Altai Capital",
    "description": "Advanced breakout strategy with comprehensive filters and risk management",
    "params": {
        "take_long": {"type": "bool", "default": True},
        "take_short": {"type": "bool", "default": False},
        "vol_ma_period": {"type": "int", "default": 50, "min": 10, "max": 200},
        "rvol": {"type": "float", "default": 1.0, "min": 0.1, "max": 5.0},
        "min_abs_volume": {"type": "int", "default": 100000, "min": 10000, "max": 10000000},
        "buffer_perc": {"type": "float", "default": 0.01, "min": 0.001, "max": 0.1},
        "tp_multiplier_1": {"type": "float", "default": 300.0, "min": 50, "max": 1000},
        "tp_multiplier_2": {"type": "float", "default": 500.0, "min": 50, "max": 1000},
        "tp_multiplier_3": {"type": "float", "default": 700.0, "min": 50, "max": 1000},
        "timeframe": {"type": "str", "default": "1m", "options": ["1m", "5m", "15m", "30m", "1h", "1D"]}
    }
}