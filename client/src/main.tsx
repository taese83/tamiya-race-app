import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {BrowserRouter} from 'react-router'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {ThemeProvider, CssBaseline, createTheme} from '@mui/material'
import {RaceListPage} from './pages/RaceListPage'

const queryClient = new QueryClient({
  defaultOptions: {queries: {retry: 1, staleTime: 10 * 60 * 1000}},
})

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {main: '#c62828'},
    background: {default: '#f5f5f5'},
  },
  typography: {fontFamily: ['Pretendard', 'Noto Sans KR', 'sans-serif'].join(',')},
  shape: {borderRadius: 8},
})

const root = document.getElementById('root')
if (!root) throw new Error('root not found')

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <RaceListPage />
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
