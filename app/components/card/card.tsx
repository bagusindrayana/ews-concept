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
    return (<div className={'card red-bordered '+className}>
        <div className="card-header red-bordered-bottom">
            {title}
        </div>
        <div className="card-content">
            {children}
        </div>
    </div>)
}