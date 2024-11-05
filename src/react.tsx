// src/react.tsx
import * as React from 'react';
// import * as ReactDOM from 'react-dom';

import { createRoot } from 'react-dom/client';
const container = document.getElementById('root');
if (!container) {
    throw new Error('Container not found');
}
console.log('👋 This message is from reaact.tsx', container);

const root = createRoot(container); // createRoot(container!) if you use TypeScript

// const Index = () => {
//     return <div>Hello React! Index now? </div>;
// };

import App from './App';

root.render(<App />);

// ReactDOM.render(<Index />, document.getElementById('app'));

