import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import VConsole from 'vconsole';

// Initialize VConsole only in development or test environments
if (import.meta.env.MODE === 'development' || import.meta.env.MODE === 'test') {
  new VConsole();
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(<App />);