import React from 'react'
import { Link } from 'react-router-dom'



export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
        
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 bg-slate-900 backdrop-blur border-b border-blue-100">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
            A
          </div>
          <span className="font-bold text-xl text-blue-700">AskMyDocs</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-slate-300 hover:text-slate-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>
      

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 text-center py-24">
      
        <h1 className="text-5xl md:text-6xl font-bold text-slate-200 mb-6 leading-tight max-w-3xl">
          Chat with your
          <br />
          <span className="text-blue-600">PDF documents</span>
        </h1>

        <p className="text-xl text-slate-400 mb-10 max-w-lg">
          Upload any PDF. Ask questions in plain English. Get accurate answers
          with exact page citations.
        </p>

        <div className="flex items-center gap-4">
          <Link
            to="/register"
            className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-all shadow-lg hover:-translate-y-0.5"
          >
            Start for free →
          </Link>
          <Link
            to="/login"
            className="text-slate-200 hover:text-blue-200  font-bold"
          >
            Sign in
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-3xl w-full text-left">
          {[
            {
              icon: "📄",
              title: "Upload any PDF",
              desc: "Research papers, contracts, reports — any PDF up to 20MB.",
            },
            {
              icon: "🔍",
              title: "Semantic search",
              desc: "Vector embeddings find the most relevant passages, not just keywords.",
            },
            {
              icon: "💬",
              title: "Cited answers",
              desc: "Every answer includes the exact page number so you can verify.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-slate-850 rounded-2xl p-6 border border-slate-100 shadow-sm"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <div className="font-semibold text-slate-300 mb-1">{f.title}</div>
              <div className="text-slate-400 text-sm leading-relaxed">
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
