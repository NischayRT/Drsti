import './globals.css'

export const metadata = {
  title: 'Drsti',
  description: 'AI-powered focus timer',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  )
}