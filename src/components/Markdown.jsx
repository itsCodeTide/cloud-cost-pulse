import { cn } from '@/lib/utils'

function parseBold(line) {
  if (!line.includes('**')) return line
  return line.split(/\*\*(.*?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-foreground">{part}</strong> : part
  )
}

export default function Markdown({ text = '', className }) {
  if (!text) return null
  const lines = text.split('\n')
  const elements = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('### ')) elements.push(<h3 key={i} className="text-sm font-semibold text-foreground mt-4 mb-1.5">{line.slice(4)}</h3>)
    else if (line.startsWith('## ')) elements.push(<h2 key={i} className="text-base font-semibold text-foreground mt-5 mb-2">{line.slice(3)}</h2>)
    else if (line.startsWith('# ')) elements.push(<h1 key={i} className="text-lg font-bold text-foreground mt-4 mb-2">{line.slice(2)}</h1>)
    else if (line.startsWith('---')) elements.push(<hr key={i} className="border-border my-3" />)
    else if (line.startsWith('- ') || line.startsWith('* '))
      elements.push(<div key={i} className="flex gap-2 text-sm text-muted-foreground leading-relaxed"><span className="text-primary mt-1.5 flex-shrink-0">•</span><span>{parseBold(line.slice(2))}</span></div>)
    else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)[1]
      elements.push(<div key={i} className="flex gap-2 text-sm text-muted-foreground leading-relaxed"><span className="text-primary font-medium flex-shrink-0 w-5">{num}.</span><span>{parseBold(line.replace(/^\d+\.\s/, ''))}</span></div>)
    } else if (line === '') elements.push(<div key={i} className="h-2" />)
    else elements.push(<p key={i} className="text-sm text-muted-foreground leading-relaxed">{parseBold(line)}</p>)
    i++
  }
  return <div className={cn('space-y-0.5', className)}>{elements}</div>
}
