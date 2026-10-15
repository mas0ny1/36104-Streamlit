import React, { useEffect, useState } from 'react';
import ChartPanel from './ChartPanel';
import { HeaderTicker, FooterTicker } from './Tickers';
import config from './config/config.json';
import './App.css';

function App() {
  const { symbols } = config.crypto;
  const [currentPositions, setCurrentPositions] = useState(symbols);
  const [data, setData] = useState(null);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const dataLoaded = symbols.every(symbol => data?.[symbol]?.['1s']?.length > 0);

  useEffect(() => {
    let active = true;
    let socket;
    let reconnectTimer;

    const connectWebSocket = () => {
      if (!active) return;
      socket = new WebSocket('ws://localhost:8000');

      socket.onopen = () => {
        if (active) setWsStatus('connected');
      };

      socket.onmessage = (event) => {
        if (!active) return;
        try {
          const message = JSON.parse(event.data);

          if (message.type === "historical") {
            setData(prevData => {
              const newData = prevData || {};
              return {
                ...newData,
                [message.symbol]: {
                  ...(newData[message.symbol] || {}),
                  [message.interval]: message.data
                }
              };
            });
          }
          else if (message.type === "update") {
            setData(prevData => {
              if (!prevData?.[message.symbol]?.[message.interval]) return prevData;

              const intervalData = [...prevData[message.symbol][message.interval]];
              const updateIndex = intervalData.findIndex(
                candle => candle.time === message.data.time
              );

              if (updateIndex !== -1) {
                intervalData[updateIndex] = message.data;
              } else {
                intervalData.unshift(message.data);
              }

              return {
                ...prevData,
                [message.symbol]: {
                  ...prevData[message.symbol],
                  [message.interval]: intervalData
                }
              };
            });
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      };

      socket.onerror = () => {
        if (active) setWsStatus('error');
      };

      socket.onclose = () => {
        if (!active) return;
        setWsStatus('disconnected');
        reconnectTimer = setTimeout(connectWebSocket, 3000);
      };
    };

    connectWebSocket();
    return () => {
      active = false;
      clearTimeout(reconnectTimer);
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        socket.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!dataLoaded) return;
    
    const rotationTime = Math.floor(
      Math.random() * 
      (config.dashboard.chartRotation.maxInterval - config.dashboard.chartRotation.minInterval) + 
      config.dashboard.chartRotation.minInterval
    );

    console.log('Starting rotation timer with interval:', rotationTime);
    
    const rotationInterval = setInterval(() => {
      setCurrentPositions(prev => {
        const [first, ...rest] = prev;
        return [...rest, first];
      });
    }, rotationTime);
  
    return () => clearInterval(rotationInterval);
  }, [dataLoaded]);

  return (
    <div className="root">
      <div className="header-strip">
        <HeaderTicker data={data} />
      </div>
      <div className="app-container">
        {wsStatus !== 'connected' && (
          <div className="status-indicator error">
            WebSocket: {wsStatus}
          </div>
        )}
        <div className="chart-grid">
          <div className="chart-cell large-chart">
            <div className="chart-content">
              <h3>{currentPositions[0]}</h3>
              <ChartPanel 
                data={data?.[currentPositions[0]]} 
                isLarge={true} 
                symbol={currentPositions[0]} 
              />
            </div>
          </div>
          {currentPositions.slice(1).map(symbol => (
            <div key={symbol} className="chart-cell small-chart">
              <div className="chart-content">
                <h3>{symbol}</h3>
                <ChartPanel 
                  data={data?.[symbol]} 
                  symbol={symbol} 
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="footer-strip">
        <FooterTicker data={data} />
      </div>
    </div>
  );
}

export default App;
