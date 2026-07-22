
// primary matches the web app's actual brand button color (Tailwind blue-600, the
// bg-blue-600/hover:bg-blue-700 used for primary CTAs across frontend/) — this single value
// cascades to every screen in the app since ~1000 button/accent references all read from here.
const colors = {
  primary: '#2563EB',
  secondary: '#666666',
  defaultBlack: '#191717',  
  defaultWhite: '#FFFFFF',
  warning: '#DC2626', 
  success: '#259800',  
  verification: '#FFC830', 
  background: '#EDF2F7',
  text: '#212121',
};

export default colors;
