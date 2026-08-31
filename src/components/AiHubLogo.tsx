import React from 'react';

interface AiHubLogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
  size?: number | string;
}

export default function AiHubLogo({
  className = 'size-8',
  size,
  style,
  alt = 'AI HUB Logo',
  ...props
}: AiHubLogoProps) {
  return (
    <img
      src="/images/image.png"
      alt={alt}
      className={`object-contain select-none ${className}`}
      style={{
        ...(size ? { width: size, height: size } : {}),
        ...style,
      }}
      {...props}
    />
  );
}
