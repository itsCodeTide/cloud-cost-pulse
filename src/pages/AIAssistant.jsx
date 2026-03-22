import { useState, useRef, useEffect } from 'react'
import { aiApi } from '@/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import Markdown from '@/components/Markdown'
import { cn } from '@/lib/utils'
import { Bot, Send, User, RotateCcw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const INITIAL = {
  role: 'assistant',
  content: `👋 Hi! I'm **CloudCost AI**, your FinOps intelligence assistant.

I have full context of your cloud infrastructure:
- **$137,920/mo** across AWS ($84,320), Azure ($32,100), GCP ($21,500)
- **$36,040** in identified waste (26.1% of spend)
- **$91,320/yr** in savings opportunities — 6 active recommendations
- **5 risks** identified (1 critical, 2 high)

Ask me anything about your costs, optimizations, or infrastructure risks.`,
}

const SUGGESTIONS = [
  'What are my biggest cost drivers?',
  'How can I reduce my AWS bill by 20%?',
  'Explain the top 3 quick wins',
  'What critical risks need immediate attention?',
  'Build a 90-day cost reduction roadmap',
]

function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={cn('flex gap-3 items-start', isUser && 'flex-row-reverse')}>
      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', isUser ? 'bg-primary/20' : 'bg-primary/10 ring-1 ring-primary/20')}>
        {isUser ? <User className="h-3.5 w-3.5 text-primary" /> : <Bot className="h-3.5 w-3.5 text-primary" />}
      </div>
      <div className={cn('max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
        isUser ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-card border border-border rounded-tl-sm')}>
        {isUser ? <p className="whitespace-pre-wrap">{msg.content}</p> : <Markdown text={msg.content} />}
      </div>
    </div>
  )
}

export default function AIAssistant() {
  const [messages, setMessages] = useState([INITIAL])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const send = async (text) => {
    const content = (text || input).trim()
    if (!content || loading) return
    setInput('')
    const history = [...messages, { role: 'user', content }]
    setMessages(history)
    setLoading(true)
    try {
      const res = await aiApi.chat(history.slice(1).map(m => ({ role: m.role, content: m.content })))
      setMessages(prev => [...prev, { role: 'assistant', content: res.content }])
    } catch (err) {
      toast.error('AI error: ' + err.message)
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Error: ' + err.message }])
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 7rem)' }}>
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Bot className="h-5 w-5 text-primary" />AI Assistant</h1>
          <p className="text-sm text-muted-foreground">Claude-powered FinOps intelligence with full platform context</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setMessages([INITIAL])}>
          <RotateCcw className="h-3.5 w-3.5" />Reset
        </Button>
      </div>
      <Card className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-2">
          {messages.map((m, i) => <Bubble key={i} msg={m} />)}
          {loading && (
            <div className="flex gap-3 items-start">
              <div className="w-7 h-7 rounded-full bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center flex-shrink-0">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1.5 items-center h-4">
                  {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay:`${i*150}ms` }} />)}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        {messages.length <= 1 && (
          <div className="px-4 pb-3 border-t border-border pt-3 flex-shrink-0">
            <p className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wider">Suggested</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/20 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">{s}</button>
              ))}
            </div>
          </div>
        )}
        <div className="p-4 border-t border-border flex gap-2 flex-shrink-0">
          <Textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Ask about costs, optimizations, or infrastructure risks…"
            className="min-h-0 h-9 resize-none py-2 leading-5" rows={1} />
          <Button onClick={() => send()} disabled={loading || !input.trim()} size="icon" className="h-9 w-9 flex-shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </Card>
    </div>
  )
}
