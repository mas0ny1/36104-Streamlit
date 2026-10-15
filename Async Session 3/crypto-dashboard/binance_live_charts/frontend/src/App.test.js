import React from 'react';
import { act, render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./ChartPanel', () => () => null);
jest.mock('./Tickers', () => ({
  HeaderTicker: () => null,
  FooterTicker: () => null,
}));

const originalWebSocket = global.WebSocket;
let sockets;

beforeEach(() => {
  jest.useFakeTimers();
  sockets = [];
  global.WebSocket = class {
    constructor(url) {
      this.url = url;
      this.closed = false;
      sockets.push(this);
    }

    close() {
      this.closed = true;
      setTimeout(() => this.onclose?.(), 0);
    }
  };
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  global.WebSocket = originalWebSocket;
});

test('Strict Mode cleanup leaves one connection and does not start a second feed', () => {
  const { unmount } = render(<React.StrictMode><App /></React.StrictMode>);
  act(() => jest.advanceTimersByTime(6000));

  expect(sockets.filter(socket => !socket.closed)).toHaveLength(1);
  expect(sockets).toHaveLength(2);

  unmount();
  act(() => jest.advanceTimersByTime(6000));
  expect(sockets.filter(socket => !socket.closed)).toHaveLength(0);
  expect(sockets).toHaveLength(2);
});

test('a lost connection retries, and unmount cancels a pending retry', () => {
  const { unmount } = render(<App />);
  act(() => sockets[0].onopen());
  expect(screen.queryByText(/WebSocket:/)).not.toBeInTheDocument();

  act(() => sockets[0].close());
  act(() => jest.advanceTimersByTime(3001));
  expect(sockets).toHaveLength(2);
  expect(sockets.filter(socket => !socket.closed)).toHaveLength(1);
  expect(screen.getByText('WebSocket: disconnected')).toBeInTheDocument();

  act(() => sockets[1].close());
  act(() => jest.advanceTimersByTime(1));
  unmount();
  act(() => jest.advanceTimersByTime(6000));
  expect(sockets).toHaveLength(2);
});
