// Tickers.js
import React from 'react';
import config from './config/config.json';

const formatDateTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const formatPrice = (data, symbol) => {
  if (!data || !data[symbol] || !data[symbol]['1s']) return 'Loading...';
  const oneSecData = data[symbol]['1s'];
  if (!oneSecData.length) return 'Loading...';
  return oneSecData[0].price.toFixed(2);
};

export const HeaderTicker = ({ data }) => {
  const headerStyles = {
    tickerWrapper: {
      width: '100%',
      height: '100%',
      display: 'flex',
      paddingTop: '13px',
      paddingBottom: '2px',
      color: 'white'
    },
    tickerContent: {
      display: 'inline-block',
      whiteSpace: 'nowrap',
      paddingLeft: '100%',
      animation: 'headerTicker 20s linear infinite',
      lineHeight: '24px',
      fontSize: '24px'
    }
  };

  const { symbols } = config.crypto;
  
  // Get the most recent time from any symbol's 1s data
  let currentTime = null;
  for (const symbol of symbols) {
    const oneSecData = data?.[symbol]?.['1s'];
    if (oneSecData?.length > 0) {
      currentTime = oneSecData[0].time;
      break;
    }
  }

  const priceText = symbols.map(symbol => 
    `${symbol}: $${formatPrice(data, symbol)}`
  ).join(' • ');

  return (
    <>
      <style>
        {`
          @keyframes headerTicker {
            0% { transform: translateX(0); }
            100% { transform: translateX(-100%); }
          }
          .header-ticker-content:hover {
            animation-play-state: paused;
          }
        `}
      </style>
      <div style={headerStyles.tickerWrapper}>
        <div className="header-ticker-content" style={headerStyles.tickerContent}>
          dailydata.ai • updated {currentTime ? formatDateTime(currentTime) : 'connecting...'} • {priceText}
        </div>
      </div>
    </>
  );
};

export const FooterTicker = ({ data }) => {
  const footerStyles = {
    tickerWrapper: {
      width: '100%',
      height: '100%',
      display: 'flex',
      paddingTop: '14px',
      paddingBottom: '14px',
      color: 'white'
    },
    tickerContent: {
      display: 'inline-block',
      whiteSpace: 'nowrap',
      paddingLeft: '100%',
      animation: 'footerTicker 20s linear infinite',
      lineHeight: '12px',
      fontSize: '12px'
    }
  };

  let currentTime = null;
  for (const symbol of config.crypto.symbols) {
    const oneSecData = data?.[symbol]?.['1s'];
    if (oneSecData?.length > 0) {
      currentTime = oneSecData[0].time;
      break;
    }
  }

  const timeString = currentTime ? formatDateTime(currentTime) : 'connecting...';

  return (
    <>
      <style>
        {`
          @keyframes footerTicker {
            0% { transform: translateX(0); }
            100% { transform: translateX(-100%); }
          }
          .footer-ticker-content:hover {
            animation-play-state: paused;
          }
        `}
      </style>
      <div style={footerStyles.tickerWrapper}>
        <div className="footer-ticker-content" style={footerStyles.tickerContent}>
          {timeString} • {timeString} • {timeString} •
        </div>
      </div>
    </>
  );
};