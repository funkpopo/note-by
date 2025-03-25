import ReactDOM from 'react-dom/client'
import App from './App'
import '@douyinfe/semi-ui/dist/css/semi.min.css'
import './styles/index.css'
import './assets/theme.css'
import { ThemeProvider } from './context/theme/ThemeProvider'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
)
