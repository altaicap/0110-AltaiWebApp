#!/usr/bin/env python3
import requests
import json
from datetime import datetime, timedelta

# Test PBH Algo backtest with specific parameters
backtest_request = {
    'strategy_name': 'Prior Bar High (PBH) Algo',
    'symbol': 'AAPL',
    'start_date': (datetime.now() - timedelta(days=30)).isoformat(),
    'end_date': (datetime.now() - timedelta(days=1)).isoformat(),
    'timeframe': '1D',
    'parameters': {
        'take_long': True,
        'take_short': False,
        'max_entry_count': 2,
        'tp_multiplier_1': 300.0,
        'adr_multiplier': 1.5,
        'risk_per_trade': 1.0
    }
}

print('Testing PBH Algo Backtest...')
response = requests.post('https://stratbacktest.preview.emergentagent.com/api/backtest', json=backtest_request)
print('Status:', response.status_code)

if response.status_code == 200:
    result = response.json()
    print('Backtest Results:')
    print('  Strategy:', result.get('strategy_name'))
    print('  Symbol:', result.get('symbol'))
    print('  Total Return: {:.2f}%'.format(result.get('total_return', 0)))
    print('  Win Rate: {:.1f}%'.format(result.get('win_rate', 0)))
    print('  Total Trades:', result.get('total_trades', 0))
    print('  Winning Trades:', result.get('winning_trades', 0))
    print('  Losing Trades:', result.get('losing_trades', 0))
    print('  Avg PnL per Trade: ${:.2f}'.format(result.get('avg_pnl_per_trade', 0)))
    print('  ROI: {:.2f}%'.format(result.get('roi', 0)))
else:
    print('Error:', response.text)