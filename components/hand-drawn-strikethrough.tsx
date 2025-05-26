"use client"

import type React from "react"

import { useEffect, useState, useRef, useCallback } from "react"
import { motion } from "framer-motion"

interface HandDrawnStrikethroughProps {
  parentRef: React.RefObject<HTMLElement>
  placeId: string
  isInitialLoad: boolean
}

// Predefined unique strikethrough patterns for each place
const strikethroughPatterns = {
  "1": {
    // Arsicault - slightly wavy, medium pressure
    getPath: (width: number, height: number) => {
      const midY = height * 0.55 // Centered vertically
      return `
        M 0,${midY + 1} 
        C ${width * 0.2},${midY - 2} ${width * 0.4},${midY + 3} ${width * 0.6},${midY - 1} 
        C ${width * 0.8},${midY + 2} ${width * 0.9},${midY - 1} ${width},${midY + 1}
      `
    },
    strokeWidth: 2.2,
    strokeColor: "#171717",
  },
  "2": {
    // Tartine - more angular, heavier pressure
    getPath: (width: number, height: number) => {
      const midY = height * 0.55
      return `
        M 0,${midY} 
        L ${width * 0.3},${midY + 3}
        L ${width * 0.7},${midY - 2}
        L ${width},${midY + 1}
      `
    },
    strokeWidth: 2.5,
    strokeColor: "#171717",
  },
  "3": {
    // b. patisserie - gentle curve, light pressure
    getPath: (width: number, height: number) => {
      const midY = height * 0.55
      return `
        M 0,${midY - 1} 
        Q ${width * 0.5},${midY + 4} ${width},${midY - 1}
      `
    },
    strokeWidth: 2,
    strokeColor: "#171717",
  },
  "4": {
    // Neighbor - double line, medium pressure
    getPath: (width: number, height: number) => {
      const midY = height * 0.55
      return `
        M 0,${midY - 1} 
        C ${width * 0.3},${midY + 2} ${width * 0.6},${midY - 2} ${width},${midY}
        M 0,${midY + 2} 
        C ${width * 0.4},${midY} ${width * 0.7},${midY + 3} ${width},${midY + 1}
      `
    },
    strokeWidth: 1.8,
    strokeColor: "#171717",
  },
  "5": {
    // Jane - straight but slightly uneven, heavy pressure
    getPath: (width: number, height: number) => {
      const midY = height * 0.55
      return `
        M 0,${midY} 
        L ${width * 0.25},${midY + 1}
        L ${width * 0.5},${midY - 1}
        L ${width * 0.75},${midY + 2}
        L ${width},${midY - 1}
      `
    },
    strokeWidth: 2.7,
    strokeColor: "#171717",
  },
  "6": {
    // Thorough - very wavy, medium-light pressure
    getPath: (width: number, height: number) => {
      const midY = height * 0.55
      return `
        M 0,${midY} 
        C ${width * 0.2},${midY + 4} ${width * 0.3},${midY - 3} ${width * 0.5},${midY + 2}
        C ${width * 0.7},${midY - 4} ${width * 0.8},${midY + 3} ${width},${midY - 1}
      `
    },
    strokeWidth: 2.1,
    strokeColor: "#171717",
  },
  "7": {
    // Craftsman - zigzag, medium pressure
    getPath: (width: number, height: number) => {
      const midY = height * 0.55
      return `
        M 0,${midY - 2} 
        L ${width * 0.2},${midY + 3}
        L ${width * 0.4},${midY - 2}
        L ${width * 0.6},${midY + 3}
        L ${width * 0.8},${midY - 2}
        L ${width},${midY + 1}
      `
    },
    strokeWidth: 2.3,
    strokeColor: "#171717",
  },
  "8": {
    // Le Marais - elegant curve, medium pressure
    getPath: (width: number, height: number) => {
      const midY = height * 0.55
      return `
        M 0,${midY + 3} 
        C ${width * 0.3},${midY - 2} ${width * 0.7},${midY - 2} ${width},${midY + 2}
      `
    },
    strokeWidth: 2.2,
    strokeColor: "#171717",
  },
  "9": {
    // Vive La Tarte - playful loops, variable pressure
    getPath: (width: number, height: number) => {
      const midY = height * 0.55
      return `
        M 0,${midY} 
        C ${width * 0.2},${midY + 5} ${width * 0.3},${midY - 4} ${width * 0.5},${midY}
        C ${width * 0.7},${midY + 4} ${width * 0.8},${midY - 3} ${width},${midY + 1}
      `
    },
    strokeWidth: 2.4,
    strokeColor: "#171717",
  },
}

export default function HandDrawnStrikethrough({ parentRef, placeId, isInitialLoad }: HandDrawnStrikethroughProps) {
  const [path, setPath] = useState("")
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [isReady, setIsReady] = useState(false)
  const pathRef = useRef<SVGPathElement>(null)
  const lastDimensionsRef = useRef({ width: 0, height: 0 })

  // Get the pattern for this place, or use a default if not found
  const pattern = strikethroughPatterns[placeId as keyof typeof strikethroughPatterns] || {
    getPath: (width: number, height: number) => {
      const midY = height * 0.55
      return `M 0,${midY} L ${width},${midY}`
    },
    strokeWidth: 2,
    strokeColor: "#171717",
  }

  const updatePath = useCallback(() => {
    const element = parentRef.current
    if (!element) return

    const rect = element.getBoundingClientRect()
    const width = rect.width
    const height = rect.height

    // Only update if dimensions actually changed significantly (avoid micro-changes)
    const lastDimensions = lastDimensionsRef.current
    const widthChanged = Math.abs(width - lastDimensions.width) > 1
    const heightChanged = Math.abs(height - lastDimensions.height) > 1

    // Only proceed if we have valid dimensions and they've actually changed
    if (width > 0 && height > 0 && (widthChanged || heightChanged || !isReady)) {
      // Update the ref with new dimensions
      lastDimensionsRef.current = { width, height }

      // Set dimensions for the SVG
      setDimensions({ width, height })

      // Use the predefined pattern for this place
      setPath(pattern.getPath(width, height))

      // Mark as ready if not already
      if (!isReady) {
        setIsReady(true)
      }
    }
  }, [parentRef, pattern, isReady])

  useEffect(() => {
    if (!parentRef.current) return

    // For initial load, wait a bit longer to ensure text is fully rendered
    const delay = isInitialLoad ? 300 : 0
    const timeoutId = setTimeout(updatePath, delay)

    // Update on resize, but debounce to avoid excessive updates
    let resizeTimeout: NodeJS.Timeout
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(updatePath, 16) // Debounce to next frame
    })

    if (parentRef.current) {
      resizeObserver.observe(parentRef.current)
    }

    return () => {
      clearTimeout(timeoutId)
      clearTimeout(resizeTimeout)
      if (parentRef.current) {
        resizeObserver.unobserve(parentRef.current)
      }
    }
  }, [updatePath, isInitialLoad])

  // Animation for drawing the path - slower now
  const pathAnimation = {
    hidden: {
      pathLength: 0,
      opacity: 0,
    },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: {
          type: "spring",
          duration: isInitialLoad ? 0 : 1.2, // No animation on initial load
          bounce: 0,
          mass: 1.2,
          damping: 25,
        },
        opacity: { duration: 0.01 },
      },
    },
  }

  // Don't render until we have valid dimensions and are ready
  if (dimensions.width === 0 || dimensions.height === 0 || !isReady) return null

  return (
    <svg
      className="absolute left-0 top-0 overflow-visible"
      width={dimensions.width}
      height={dimensions.height}
      viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      style={{ pointerEvents: "none" }}
    >
      <motion.path
        ref={pathRef}
        d={path}
        fill="transparent"
        stroke={pattern.strokeColor}
        strokeLinecap="round"
        initial={isInitialLoad ? "visible" : "hidden"} // Start visible on initial load
        animate="visible"
        variants={pathAnimation}
        style={{
          // Add some texture to the stroke
          strokeDasharray: "1,0",
          // Use the pattern's stroke width
          strokeWidth: `${pattern.strokeWidth}px`,
        }}
      />
    </svg>
  )
}
