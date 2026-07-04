"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Define the type for a single category item
export interface Category {
  id: string | number;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  featured?: boolean;
}

// Define the props for the CategoryList component
export interface CategoryListProps {
  title?: string;
  subtitle?: string;
  categories: Category[];
  headerIcon?: React.ReactNode;
  className?: string;
}

export const CategoryList = ({
  title,
  subtitle,
  categories,
  headerIcon,
  className,
}: CategoryListProps) => {
  const [hoveredItem, setHoveredItem] = useState<string | number | null>(null);
  const showHeader = Boolean(title || headerIcon);

  return (
    <div className={cn("w-full bg-background text-foreground", className)}>
      <div className="mx-auto">
        {/* Header Section */}
        {showHeader && (
          <div className="text-center mb-12 md:mb-16">
            {headerIcon && (
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/80 to-primary mb-6 text-primary-foreground">
                {headerIcon}
              </div>
            )}
            {title && (
              <h1 className="text-4xl md:text-5xl font-bold mb-2 tracking-tight">{title}</h1>
            )}
            {subtitle && (
              <h2 className="text-4xl md:text-5xl font-bold text-muted-foreground">{subtitle}</h2>
            )}
          </div>
        )}

        {/* Categories List */}
        <div className="space-y-3">
          {categories.map((category) => {
            const isHovered = hoveredItem === category.id;

            const cardInner = (
              <div
                className={cn(
                  "relative overflow-hidden border bg-card transition-all duration-300 ease-in-out cursor-pointer rounded-xl",
                  // Hover state styles
                  isHovered
                    ? 'h-32 border-primary shadow-lg shadow-primary/20 bg-primary/5'
                    : 'h-24 border-border hover:border-primary/50'
                )}
              >
                {/* Corner brackets that appear on hover */}
                {isHovered && (
                  <>
                    <div className="absolute top-3 left-3 w-6 h-6">
                      <div className="absolute top-0 left-0 w-4 h-0.5 bg-primary" />
                      <div className="absolute top-0 left-0 w-0.5 h-4 bg-primary" />
                    </div>
                    <div className="absolute bottom-3 right-3 w-6 h-6">
                      <div className="absolute bottom-0 right-0 w-4 h-0.5 bg-primary" />
                      <div className="absolute bottom-0 right-0 w-0.5 h-4 bg-primary" />
                    </div>
                  </>
                )}

                {/* Content */}
                <div className="flex items-center justify-between h-full px-6 md:px-8">
                  <div className="flex-1">
                    <h3
                      className={cn(
                        "font-bold transition-colors duration-300",
                        category.featured ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl',
                        isHovered ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      {category.title}
                    </h3>
                    {category.subtitle && (
                      <p
                        className={cn(
                          "mt-1 transition-colors duration-300 text-sm md:text-base",
                          isHovered ? 'text-foreground/90' : 'text-muted-foreground'
                        )}
                      >
                        {category.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Icon appears on the right on hover */}
                  {category.icon && isHovered && (
                    <div className="text-primary transition-opacity duration-300">
                      {category.icon}
                    </div>
                  )}
                </div>
              </div>
            );

            const handlers = {
              onMouseEnter: () => setHoveredItem(category.id),
              onMouseLeave: () => setHoveredItem(null),
            };

            // Render as a Next.js Link when an href is provided (crawlable +
            // keyboard accessible); otherwise fall back to a clickable div.
            if (category.href) {
              return (
                <Link
                  key={category.id}
                  href={category.href}
                  className="relative group block"
                  {...handlers}
                >
                  {cardInner}
                </Link>
              );
            }

            return (
              <div
                key={category.id}
                className="relative group"
                onClick={category.onClick}
                {...handlers}
              >
                {cardInner}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
