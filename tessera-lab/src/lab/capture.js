export const captureCanvas=(canvas)=>{const a=document.createElement('a');a.download=`tessera-lab-${Date.now()}.png`;a.href=canvas.toDataURL('image/png');a.click();};
