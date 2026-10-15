// ChartPanel.jsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import config from './config/config.json';
import { formatTime } from './utils/timeFormatter';

const TimeTick = ({ x, y, payload, timeInterval, fontSize }) => {
  const lines = formatTime(payload.value, timeInterval).split(' ');
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fill="#59616f"
      fontSize={fontSize}
      className="recharts-cartesian-axis-tick-value"
    >
      {lines.map((line, index) => (
        <tspan key={index} x={x} dy={index === 0 ? '0.9em' : '1.2em'}>
          {line}
        </tspan>
      ))}
    </text>
  );
};

const makeTimeTicks = (start, end, count) => {
  const minute = 60 * 1000;
  const day = 24 * 60 * minute;
  const targetStep = Math.max(1, (end - start) / count);
  const steps = [1, 5, 10, 15, 30, 60, 180, 360, 720, 1440, 2880, 4320, 10080, 20160]
    .map(minutes => minutes * minute);
  const nearest = (values, target) => values.reduce((best, value) =>
    Math.abs(Math.log(value / target)) < Math.abs(Math.log(best / target)) ? value : best
  );
  const step = targetStep <= 21 * day ? nearest(steps, targetStep) : null;
  const ticks = [];

  if (step) {
    const offset = new Date(start).getTimezoneOffset() * minute;
    const first = Math.ceil((start - offset) / step) * step + offset;
    for (let time = first; time <= end; time += step) ticks.push(time);
  } else {
    const months = nearest([1, 3, 6, 12, 24], targetStep / (30.4375 * day));
    const date = new Date(start);
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    date.setMonth(Math.floor(date.getMonth() / months) * months);
    while (date.getTime() <= end) {
      if (date.getTime() >= start) ticks.push(date.getTime());
      date.setMonth(date.getMonth() + months);
    }
  }
  return ticks;
};

const ChartPanel = ({ data, isLarge = false, symbol }) => {
  const { frequencies, colors, order } = config.crypto;
  const [currentInterval, setCurrentInterval] = useState(order[0]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Hook to check if all intervals have data
  useEffect(() => {
    if (!data) return;

    const allIntervalsHaveData = order.every(
      (interval) => data[interval] && data[interval].length > 0
    );

    if (allIntervalsHaveData && !dataLoaded) {
      setDataLoaded(true);
    }
  }, [data, order, dataLoaded]);

  // Hook to switch intervals at random intervals
  useEffect(() => {
    if (!dataLoaded) return;

    const switchTime = Math.floor(
      Math.random() *
        (config.dashboard.timeSwitch.maxInterval -
          config.dashboard.timeSwitch.minInterval) +
        config.dashboard.timeSwitch.minInterval
    );

    const timer = setInterval(() => {
      setCurrentInterval((current) => {
        const currentIndex = order.indexOf(current);
        return order[(currentIndex + 1) % order.length];
      });
    }, switchTime);

    return () => clearInterval(timer);
  }, [order, dataLoaded]);

  // Memoized chart data
  const chartData = useMemo(() => {
    if (!data || !data[currentInterval]) return [];

    const latestData = data['1s']?.[0];
    const latestTime = latestData?.time;

    // Use a Map to ensure unique timestamps
    const timeMap = new Map();

    data[currentInterval].forEach((candle) => {
      if (!timeMap.has(candle.time)) {
        timeMap.set(candle.time, {
          time: candle.time,
          close: parseFloat(candle.price),
          high: parseFloat(candle.high),
          low: parseFloat(candle.low),
          isLatest: false,
        });
      }
      // If duplicate, ignore to prevent multiple ticks
    });

    if (latestData && latestTime) {
      if (timeMap.has(latestTime)) {
        timeMap.get(latestTime).isLatest = true;
      } else {
        timeMap.set(latestTime, {
          time: latestTime,
          close: parseFloat(latestData.price),
          high: parseFloat(latestData.high || latestData.price),
          low: parseFloat(latestData.low || latestData.price),
          isLatest: true,
        });
      }
    }

    const uniqueIntervalData = Array.from(timeMap.values()).sort((a, b) => a.time - b.time);

    return uniqueIntervalData;
  }, [data, currentInterval]);

  // Keep small price differences readable without adding needless decimals.
  const { formatYAxis, yAxisWidth, yTicks, yDomain } = useMemo(() => {
    const prices = chartData.flatMap(candle => [candle.low, candle.high, candle.close])
      .filter(Number.isFinite);
    const minimum = prices.length ? Math.min(...prices) : 0;
    const maximum = prices.length ? Math.max(...prices) : 1;
    const span = maximum - minimum || Math.max(Math.abs(maximum) * 0.01, 0.00000001);
    const roughStep = span / 4;
    const exponent = Math.floor(Math.log10(roughStep));
    const magnitude = 10 ** exponent;
    const factor = [1, 2, 2.5, 5, 10].find(value => value * magnitude >= roughStep);
    const step = factor * magnitude;
    const decimals = Math.min(8, Math.max(0, -exponent + (factor === 2.5 ? 1 : 0) - (factor === 10 ? 1 : 0)));
    const first = Math.floor(minimum / step) * step;
    const last = Math.max(first + step, Math.ceil(maximum / step) * step);
    const ticks = Array.from({ length: Math.round((last - first) / step) + 1 }, (_, index) =>
      Number((first + index * step).toFixed(decimals))
    );
    const formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    const labelLength = Math.max(
      formatter.format(ticks[0]).length,
      formatter.format(ticks[ticks.length - 1]).length,
    );
    return {
      formatYAxis: value => formatter.format(value),
      yAxisWidth: Math.max(48, Math.ceil(labelLength * (isLarge ? 7 : 6.5) + 12)),
      yTicks: ticks,
      yDomain: [ticks[0], ticks[ticks.length - 1]],
    };
  }, [chartData, isLarge]);

  const timeTicks = useMemo(() => chartData.length ? makeTimeTicks(
    chartData[0].time, chartData[chartData.length - 1].time, isLarge ? 6 : 3,
  ) : [], [chartData, isLarge]);

  // Function to render dots for the latest data point
  const renderDot = (props) => {
    const { cx, cy, payload } = props;
    if (payload.isLatest) {
      return <circle cx={cx} cy={cy} r={isLarge ? 4 : 3} fill={colors[symbol]} />;
    }
    return null;
  };

  const headerContent = (
    <div className="chart-panel-header">
      <span
        className={`font-mono font-bold ${isLarge ? 'text-sm' : 'text-xs'}`}
        style={{ color: colors[symbol] }}
      >
        {frequencies[currentInterval].display}
      </span>
      <span
        className={`font-mono font-bold ${isLarge ? 'text-lg' : 'text-sm'}`}
        style={{ color: colors[symbol] }}
      >
        {data?.['1s']?.[0]?.price?.toFixed(4) ?? 'N/A'}
      </span>
    </div>
  );

  // Early return if data is not loaded
  if (!data || !data[currentInterval]) {
    return (
      <div className="chart-panel">
        {headerContent}
        <div className="chart-panel-plot chart-loading">
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-panel">
      {headerContent}
      <div className="chart-panel-plot">
        <ResponsiveContainer width="100%" height="100%" isAnimationActive={false}>
          <LineChart
            data={chartData}
            margin={{
              top: 8,
              right: 12,
              left: 0,
              bottom: 2,
            }}
            isAnimationActive={false}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e6ec"
              vertical={false}
              isAnimationActive={false}
            />
            <XAxis
              dataKey="time"
              tickFormatter={(value) => formatTime(value, currentInterval)}
              ticks={timeTicks}
              minTickGap={18}
              tickSize={0}
              tickMargin={8}
              tickLine={false}
              axisLine={{ stroke: '#cbd1da' }}
              domain={['dataMin', 'dataMax']}
              scale="time"
              type="number"
              height={currentInterval === '5m' ? 44 : 28}
              tick={<TimeTick timeInterval={currentInterval} fontSize={isLarge ? 12 : 11} />}
            />
            <YAxis
              tick={{ fontSize: isLarge ? 12 : 11, fill: '#59616f' }}
              width={yAxisWidth}
              ticks={yTicks}
              tickSize={0}
              tickMargin={8}
              tickLine={false}
              axisLine={false}
              domain={yDomain}
              tickFormatter={formatYAxis}
              isAnimationActive={false}
            />
            <Tooltip
              labelFormatter={(value) => formatTime(value, currentInterval)}
              formatter={(value, name) => [value.toFixed(4), `${symbol} ${name}`]}
              contentStyle={{
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                fontSize: isLarge ? '12px' : '10px',
              }}
              isAnimationActive={false}
            />
            {/* Render high and low lines first */}
            <Line
              type="monotone"
              dataKey="high"
              stroke={`${colors[symbol]}44`}
              strokeWidth={isLarge ? 1 : 0.75}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              duration={0}
            />
            <Line
              type="monotone"
              dataKey="low"
              stroke={`${colors[symbol]}44`}
              strokeWidth={isLarge ? 1 : 0.75}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              duration={0}
            />
            {/* Render close line last to ensure it's on top */}
            <Line
              type="monotone"
              dataKey="close"
              stroke={colors[symbol]}
              strokeWidth={isLarge ? 1.5 : 1}
              dot={renderDot}
              activeDot={{ r: isLarge ? 4 : 3 }}
              isAnimationActive={false}
              duration={0}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartPanel;
