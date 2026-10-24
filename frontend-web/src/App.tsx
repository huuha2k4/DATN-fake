import './App.css'
import { BrowserRouter } from 'react-router-dom'
import AppScreen from './modules/app/screen/AppScreen'
import { ThemeProvider } from './modules/core/context/ThemeContext'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppScreen />
      </BrowserRouter>
    </ThemeProvider>
  )
}
