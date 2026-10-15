import asyncio
import websockets
import aiohttp
import json
from datetime import datetime, timedelta, timezone
import os
from pathlib import Path
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

##################
# CONFIGURATION
##################
def get_config_path():
    backend_dir = Path(__file__).parent
    config_path = backend_dir.parent / 'frontend' / 'src' / 'config' / 'config.json'
    
    if not config_path.is_file():
        raise FileNotFoundError(f"Config file not found at {config_path}")
    
    return str(config_path)

# Load configuration
with open(get_config_path(), 'r') as f:
    CONFIG = json.load(f)
    CRYPTO_CONFIG = CONFIG['crypto']

##################
# HELPER FUNCTIONS
##################
def calculate_start_time(config, now=None):
    """Calculate the start time based on configuration"""
    if now is None:
        now = datetime.now(timezone.utc)
    
    days = float(eval(str(config['days']))) if isinstance(config['days'], str) else float(config['days'])
    minutes = float(eval(str(config['minutes']))) if isinstance(config['minutes'], str) else float(config['minutes'])
    
    return now - timedelta(days=days, minutes=minutes)

##################
# DATA FETCHING
##################
async def fetch_all_historical_data(session, url, symbol, interval, start_time):
    """
    Fetch all historical data from start_time up to the most recent completed candle.
    Handles pagination for requests exceeding 1000 candles.
    """
    all_data = []
    current_start = start_time
    
    while True:
        params = {
            "symbol": symbol,
            "interval": interval,
            "startTime": int(current_start.timestamp() * 1000),
            "limit": 1000
        }
        
        try:
            async with session.get(url, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logging.error(f"Error fetching data: {response.status} - {error_text}")
                    break
                    
                data = await response.json()
                
                if not data:
                    break
                
                # Log the batch we received
                batch_start = datetime.fromtimestamp(data[0][0]/1000, tz=timezone.utc)
                batch_end = datetime.fromtimestamp(data[-1][0]/1000, tz=timezone.utc)
                logging.info(
                    f"Fetched batch for {symbol} {interval}: "
                    f"{len(data)} candles from {batch_start} to {batch_end}"
                )
                
                # Add the data (it comes in chronological order)
                all_data.extend(data)
                
                # If we got less than 1000 candles, we've reached the current time
                if len(data) < 1000:
                    break
                
                # Move start time to just after the newest candle we got
                newest_candle_time = data[-1][0]  # in milliseconds
                current_start = datetime.fromtimestamp((newest_candle_time + 1)/1000, tz=timezone.utc)
                
                await asyncio.sleep(0.5)  # Rate limiting
                
        except Exception as e:
            logging.error(f"Error fetching {symbol} {interval}: {e}")
            break
    
    # Reverse the data so newest is first (for client consumption)
    all_data.reverse()
    
    if all_data:
        newest = datetime.fromtimestamp(all_data[0][0]/1000, tz=timezone.utc)
        oldest = datetime.fromtimestamp(all_data[-1][0]/1000, tz=timezone.utc)
        logging.info(
            f"Completed {symbol} {interval}: "
            f"{len(all_data)} total candles from {oldest} to {newest}"
        )
    
    return all_data

##################
# WEBSOCKET HANDLER
##################
async def data_feed(websocket):
    """Main WebSocket handler for each client connection"""
    client_id = id(websocket)
    logging.info(f"Client {client_id} connected")
    
    try:
        # Send initial historical data
        now = datetime.now(timezone.utc)
        
        # Process each interval in the specified order (1s, 1m, 5m, etc.)
        for interval in CRYPTO_CONFIG['order']:
            config = CRYPTO_CONFIG['frequencies'][interval]
            start_time = calculate_start_time(config, now)
            
            # Fetch and send data for each symbol at this interval
            for symbol in CRYPTO_CONFIG['symbols']:
                url = CRYPTO_CONFIG['binance']['historical']
                logging.info(f"Client {client_id}: Fetching {interval} data for {symbol}")
                
                async with aiohttp.ClientSession() as session:
                    try:
                        # Fetch all historical data
                        data = await fetch_all_historical_data(session, url, symbol, interval, start_time)
                        
                        # Transform and send immediately when we have each symbol's data
                        transformed_data = [{
                            "time": entry[6],
                            "open": float(entry[1]),
                            "high": float(entry[2]), 
                            "low": float(entry[3]),
                            "price": float(entry[4]),
                            "volume": float(entry[5]),
                            # "quote_volume": float(entry[7]),
                            # "trades": int(entry[8]),
                            # "taker_buy_volume": float(entry[9]),
                            # "taker_buy_quote_volume": float(entry[10])
                        } for entry in data]
                        
                        # Send historical data for this symbol/interval immediately
                        period_data = {
                            "type": "historical",
                            "interval": interval,
                            "symbol": symbol,
                            "data": transformed_data
                        }
                        
                        await websocket.send(json.dumps(period_data))
                        logging.info(f"Client {client_id}: Sent {interval} historical data for {symbol}")
                    
                    except websockets.exceptions.ConnectionClosed:
                        return
                    except Exception as e:
                        logging.error(f"Client {client_id}: Error processing {symbol} {interval}: {e}")
                    
                    await asyncio.sleep(0.5)  # Rate limiting between symbols

        # Set up real-time WebSocket streams after sending all historical data
        streams = []

        for interval in CRYPTO_CONFIG['order']:
            for symbol in CRYPTO_CONFIG['symbols']:
                stream = f"{symbol.lower()}@kline_{interval}"
                streams.append(stream)

        stream_url = f"{CRYPTO_CONFIG['binance']['stream']}?streams={'/'.join(streams)}"
        logging.info(f"Client {client_id}: Connecting to Binance WebSocket: {stream_url}")
        
        # Connect to Binance WebSocket and handle real-time updates
        async with websockets.connect(stream_url) as binance_ws:
            logging.info(f"Client {client_id}: Connected to Binance WebSocket")
            
            while True:
                try:
                    message = await binance_ws.recv()
                    data = json.loads(message)
                    
                    if "data" in data:
                        kline = data["data"]["k"]
                        
                        # Transform update data to match historical format
                        update_data = {
                            "type": "update",
                            "interval": kline["i"],
                            "symbol": kline["s"],
                            "data": {
                                "time": kline["T"],
                                "open": float(kline["o"]),
                                "high": float(kline["h"]),
                                "low": float(kline["l"]),
                                "price": float(kline["c"]),
                                "volume": float(kline["v"]),
                                "quote_volume": float(kline["q"]),
                                "trades": int(kline["n"]),
                                "taker_buy_volume": float(kline["V"]),
                                "taker_buy_quote_volume": float(kline["Q"]),
                                "closed": kline["x"]
                            }
                        }
                        
                        await websocket.send(json.dumps(update_data))
                        
                except websockets.exceptions.ConnectionClosed:
                    logging.info(f"Client {client_id}: Binance WebSocket connection closed")
                    break
                except Exception as e:
                    logging.error(f"Client {client_id}: Error in WebSocket stream: {e}")
                    await asyncio.sleep(5)
                    continue

    except Exception as e:
        logging.error(f"Client {client_id}: Error in data feed: {e}")
    finally:
        logging.info(f"Client {client_id}: Data feed terminated")

##################
# SERVER STARTUP
##################
async def main():
    server = await websockets.serve(
        data_feed, 
        'localhost', 
        8000, 
        max_size=10_000_000,  # 10MB message size limit
        ping_interval=30,
        ping_timeout=10
    )
    
    logging.info("WebSocket server started on ws://localhost:8000")
    
    try:
        await asyncio.Future()  # run forever
    except KeyboardInterrupt:
        logging.info("Server shutdown initiated")
        server.close()
        await server.wait_closed()
        logging.info("Server shutdown complete")

if __name__ == '__main__':
    asyncio.run(main())
