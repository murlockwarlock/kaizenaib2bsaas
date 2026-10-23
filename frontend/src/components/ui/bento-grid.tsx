import { ComponentPropsWithoutRef, ReactNode } from "react"
import { ArrowRight, Heart, Copy, Wand2 } from "lucide-react"

import { cn } from "@/lib/utils"

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
    children: ReactNode
    className?: string
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
    name: string
    className?: string
    background: ReactNode
    Icon: React.ElementType
    description: string
    href: string
    cta: string
    onLike?: () => void
    isLiked?: boolean
    onCopyPrompt?: () => void
    onUsePrompt?: () => void
    onClick?: (e: React.MouseEvent) => void
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
    return (
        <div
            className={cn(
                "grid w-full auto-rows-[18rem] grid-cols-1 gap-4 sm:auto-rows-[20rem] md:grid-cols-2 md:auto-rows-[22rem] lg:grid-cols-3",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

const BentoCard = ({
    name,
    className,
    background,
    Icon,
    description,
    href,
    cta,
    onLike,
    isLiked,
    onCopyPrompt,
    onUsePrompt,
    onClick,
    ...props
}: BentoCardProps) => {
    const openCard = () => window.open(href, "_self")

    return (
        <div
            key={name}
            role="link"
            tabIndex={0}
            onClick={(e) => {
                if (onClick) {
                    onClick(e)
                    return
                }
                openCard()
            }}
            onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return
                e.preventDefault()
                openCard()
            }}
            className={cn(
                "group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b4a]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                // light styles
                "bg-background [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
                // dark styles
                "dark:bg-background transform-gpu dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset] dark:[border:1px_solid_rgba(255,255,255,.1)]",
                className
            )}
            {...props}
        >
        <div className="absolute inset-0">{background}</div>

        {/* Actions Overlay (Top Right) */}
        <div className="absolute top-3 right-3 z-30 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {onLike && (
                <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onLike(); }}
                    className={cn(
                        "p-2 rounded-full backdrop-blur-md transition-all hover:scale-110",
                        isLiked ? "bg-red-500 text-white" : "bg-black/40 text-white hover:bg-black/60"
                    )}
                >
                    <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
                </button>
            )}
            {onCopyPrompt && (
                <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCopyPrompt(); }}
                    className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-md transition-all hover:scale-110"
                    title="Copy Prompt"
                >
                    <Copy className="w-4 h-4" />
                </button>
            )}
            {onUsePrompt && (
                <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUsePrompt(); }}
                    className="p-2 rounded-full bg-violet-600 text-white hover:bg-violet-500 backdrop-blur-md transition-all hover:scale-110"
                    title="Use this prompt"
                >
                    <Wand2 className="w-4 h-4" />
                </button>
            )}
        </div>

        <div className="pointer-events-none z-10 p-4 absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent">
            <div className="flex transform-gpu flex-col gap-1 transition-all duration-300 lg:group-hover:-translate-y-10">
                <Icon className="h-8 w-8 origin-left transform-gpu text-white transition-all duration-300 ease-in-out" />
                <h3 className="text-xl font-semibold text-white">
                    {name}
                </h3>
                <p className="max-w-lg text-neutral-300 text-sm line-clamp-2">{description}</p>
            </div>

            <div
                className={cn(
                    "pointer-events-none flex w-full translate-y-0 transform-gpu flex-row items-center transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:hidden"
                )}
            >
                <button onClick={(e) => { e.stopPropagation(); onClick ? onClick(e) : window.open(href, '_self'); }} className="text-sm font-medium text-white flex items-center pointer-events-auto">
                    {cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                </button>
            </div>
        </div>

        <div
            className={cn(
                "pointer-events-none absolute bottom-4 left-4 hidden w-full translate-y-10 transform-gpu flex-row items-center opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:flex z-20"
            )}
        >
            <button onClick={(e) => { e.stopPropagation(); onClick ? onClick(e) : window.open(href, '_self'); }} className="text-sm font-medium text-white flex items-center pointer-events-auto hover:text-violet-400">
                {cta}
                <ArrowRight className="ml-2 h-4 w-4" />
            </button>
        </div>

        <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/[.1] group-hover:dark:bg-neutral-800/20" />
    </div>
    )
}

export { BentoCard, BentoGrid }
