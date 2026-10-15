// export const TIME_RANGES = {
//     FIVE_YEAR: 'FIVE_YEAR',
//     TWO_MONTH: 'TWO_MONTH',
//     ONE_DAY: 'ONE_DAY',
//     MINUTE_CANDLES: 'MINUTE_CANDLES',
//     MILLISECOND: 'MILLISECOND',
//   };

export const TIME_RANGES = {
    MONTH: 'MONTH',
    WEEK: 'WEEK',
    DAY: 'DAY',
    HOUR: 'HOUR',
    MINUTES: 'MINUTES'
  };
  
  export const INTERVALS = {
    [TIME_RANGES.MONTH]: '1d',
    [TIME_RANGES.WEEK]: '4h',
    [TIME_RANGES.DAY]: '1h',
    [TIME_RANGES.MINUTES]: '1m'
  };
  
  export const CHART_SETTINGS = {
    TIME_SWITCH_INTERVAL: {
      MIN: 18000,
      MAX: 26000,
    },
  };
  
  
  export const CRYPTO_COLORS = {
    BTCUSDT: '#F7931A',
    ETHUSDT: '#627EEA',
    BNBUSDT: '#F3BA2F',
    XRPUSDT: '#23292F',
    ADAUSDT: '#0033AD',
    DOGEUSDT: '#C2A633',
  };
  
 
  export const DASHBOARD_SETTINGS = {
    ROTATE_INTERVAL: {
        MIN: 40000,
        MAX: 60000,
    },
  };
  
  export const TICKER_SETTINGS = {
    TOP_SPEED: 40
  };