import './globals.css'

export const metadata = {
  title: 'FocusGuard',
  description: 'AI-powered focus timer',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
