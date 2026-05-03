export const captureCanvas=c=>{const a=document.createElement('a');a.download=`tessera-v4-${Date.now()}.png`;a.href=c.toDataURL('image/png');a.click();};
