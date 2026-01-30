import ReactDOM from 'react-dom/client';
import { Toast } from 'react-vant';

// Set global Toast duration to 3 seconds as early as possible
Toast.setDefaultOptions({ duration: 3000 });

import App from './App';
import './index.css';
// Initialize VConsole only in development or test environments
import VConsole from 'vconsole';

if (
  import.meta.env.MODE === 'development' || 
  import.meta.env.MODE === 'test'
  //  ||  import.meta.env.MODE === 'production'
  ) {
  new VConsole();
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(<App />);