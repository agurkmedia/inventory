import React, { useEffect, useState } from 'react';
import { Card, Table, Typography } from 'antd';

const { Title } = Typography;

interface Ticker {
  symbol: string;
  price: string;
}

interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
}

interface Position {
  symbol: string;
  amount: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
}

const BinancePage: React.FC = () => {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  useEffect(() => {
    // TODO: Implement real-time data fetching from Binance API
    // This is where you'd connect to websockets and fetch data
  }, []);

  const tickerColumns = [
    { title: 'Symbol', dataIndex: 'symbol', key: 'symbol' },
    { title: 'Price', dataIndex: 'price', key: 'price' },
  ];

  const orderColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Symbol', dataIndex: 'symbol', key: 'symbol' },
    { title: 'Side', dataIndex: 'side', key: 'side' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount' },
    { title: 'Price', dataIndex: 'price', key: 'price' },
  ];

  const positionColumns = [
    { title: 'Symbol', dataIndex: 'symbol', key: 'symbol' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount' },
    { title: 'Entry Price', dataIndex: 'entryPrice', key: 'entryPrice' },
    { title: 'Current Price', dataIndex: 'currentPrice', key: 'currentPrice' },
    { title: 'PNL', dataIndex: 'pnl', key: 'pnl' },
  ];

  return (
    <div>
      <Title level={2}>Binance Dashboard</Title>
      <Card title="Real-time Tickers">
        <Table dataSource={tickers} columns={tickerColumns} />
      </Card>
      <Card title="Active Orders">
        <Table dataSource={orders} columns={orderColumns} />
      </Card>
      <Card title="Open Positions">
        <Table dataSource={positions} columns={positionColumns} />
      </Card>
    </div>
  );
};

export default BinancePage;