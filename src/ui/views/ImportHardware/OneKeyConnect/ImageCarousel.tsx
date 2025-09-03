import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

interface ImageCarouselProps {
  images?: string[];
  className?: string;
}

const CAROUSEL_IMAGES = [
  '/images/onekey-usb-connect-step1.png',
  '/images/onekey-usb-connect-step2.png',
  '/images/onekey-usb-connect-step3.png',
];

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images = CAROUSEL_IMAGES,
  className,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [startX, setStartX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [images.length]);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        handleDragEnd(e.clientX);
      }
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault();
      }
    };

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (isDragging) {
        handleDragEnd(e.changedTouches[0].clientX);
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchmove', handleGlobalTouchMove);
      document.addEventListener('touchend', handleGlobalTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isDragging, startX]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const handleDragStart = (clientX: number) => {
    setStartX(clientX);
    setIsDragging(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const handleDragEnd = (clientX: number) => {
    if (!isDragging) return;

    const diff = startX - clientX;
    if (Math.abs(diff) > 20) {
      if (diff > 0) {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      } else {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
      }
    }

    setIsDragging(false);
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000);
  };

  return (
    <div className={clsx('onekey-carousel', className)}>
      <div className="absolute">
        <img src="images/onekey-usb-connect-background.svg" />
      </div>
      <div
        className="onekey-carousel-bubble"
        onMouseDown={(e) => handleDragStart(e.clientX)}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
      >
        <div className="onekey-carousel-content">
          {images.map((image, index) => (
            <div
              key={index}
              className={clsx('onekey-carousel-slide', {
                active: index === currentIndex,
                prev: index < currentIndex,
                next: index > currentIndex,
              })}
            >
              <img
                src={image}
                alt={`OneKey step ${index + 1}`}
                draggable={false}
              />
            </div>
          ))}
        </div>
        <div className="onekey-carousel-dots">
          {images.map((_, index) => (
            <div
              key={index}
              className={clsx('onekey-carousel-dot', {
                active: index === currentIndex,
              })}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
