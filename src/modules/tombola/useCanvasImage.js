import { useEffect, useState } from "react";

export default function useCanvasImage(src) {
  const [image, setImage] = useState(null);

  useEffect(() => {
    if (!src) {
      setImage(null);
      return undefined;
    }

    let isCancelled = false;
    let fallbackImage = null;
    const nextImage = new window.Image();

    nextImage.crossOrigin = "anonymous";
    nextImage.onload = () => {
      if (!isCancelled) setImage(nextImage);
    };
    nextImage.onerror = () => {
      fallbackImage = new window.Image();
      fallbackImage.onload = () => {
        if (!isCancelled) setImage(fallbackImage);
      };
      fallbackImage.onerror = () => {
        if (!isCancelled) setImage(null);
      };
      fallbackImage.src = src;
    };
    nextImage.src = src;

    return () => {
      isCancelled = true;
      nextImage.onload = null;
      nextImage.onerror = null;
      if (fallbackImage) {
        fallbackImage.onload = null;
        fallbackImage.onerror = null;
      }
    };
  }, [src]);

  return image;
}
