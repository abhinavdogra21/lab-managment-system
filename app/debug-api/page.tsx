"use client"

import { useState, useEffect } from "react"

export default function DebugAPIPage() {
  const [response, setResponse] = useState("")
  const [error, setError] = useState("")

  const testAPI = async () => {
    try {
      console.log("Testing API...")
      const res = await fetch("/api/student/booking-requests")
      console.log("Response status:", res.status)
      console.log("Response headers:", Object.fromEntries(res.headers.entries()))
      
      const text = await res.text()
      console.log("Response text:", text)
      
      if (res.ok) {
        try {
          const json = JSON.parse(text)
          setResponse(JSON.stringify(json, null, 2))
        } catch (parseError: any) {
          setError(`JSON Parse Error: ${parseError.message}\nResponse: ${text}`)
        }
      } else {
        setError(`HTTP ${res.status}: ${text}`)
      }
    } catch (err: any) {
      setError(`Fetch Error: ${err.message}`)
    }
  }

  useEffect(() => {
    testAPI()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">API Debug Page</h1>
      
      <button 
        onClick={testAPI}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Test API Again
      </button>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h3 className="font-bold">Error:</h3>
          <pre className="whitespace-pre-wrap text-sm">{error}</pre>
        </div>
      )}

      {response && (
        <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          <h3 className="font-bold mb-2">Success Response:</h3>
          <pre className="whitespace-pre-wrap text-sm">{response}</pre>
        </div>
      )}
    </div>
  )
}
