import './globals.css'

export const metadata = {
  title: 'AttentionOS',
  description: 'AI-powered focus timer',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
