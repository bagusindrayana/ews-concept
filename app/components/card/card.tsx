import './styles.css'
export default function Card({
    children,
    title,
    className,
    borderColor
}: Readonly<{
    children: React.ReactNode,
    title?: React.ReactNode,
    className?: string
    borderColor?: string
}>) {
    return (<div className={'card '+className} style={{
        border: " 3px " + (borderColor??"red") + " solid"
    }}>
        <div className="card-header" style={{
            borderBottom: " 3px " + (borderColor??"red") + " solid"
        }}>
            {title}
        </div>
        <div className="card-content">
            {children}
        </div>
    </div>)
}