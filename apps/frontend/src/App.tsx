import { useState, useEffect } from 'react'

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api')
    .then(res => res.text())
    .then(data => setMessage(data))
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-blue-600">React + Tailwind</h1>
        <p className="mt-4 text-gray-700">Response dari Backend: <strong>{message}</strong></p>
      </div>
    </div>
  )
}

export default App