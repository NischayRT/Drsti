import './globals.css'

export const metadata = {
  title: 'FocusGuard',
  description: 'AI-powered focus timer',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  )
}