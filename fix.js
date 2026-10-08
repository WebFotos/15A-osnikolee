const fs = require('fs');

let code = fs.readFileSync('src/app/admin/WelcomeVideoAdmin.tsx', 'utf8');

if (!code.includes('import { supabase }')) {
  code = code.replace(
    'import { Loader2, Video, Upload, Trash2, Check, X } from "lucide-react";',
    'import { Loader2, Video, Upload, Trash2, Check, X } from "lucide-react";\nimport { supabase } from "@/lib/supabase";'
  );
}

const startMarker = 'const { signedUrl, videoPath } = await urlRes.json();';
const endMarker = 'STEP 3: Confirm upload';

const startIndex = code.indexOf(startMarker);
const endIndexStr = code.substring(startIndex).indexOf(endMarker);

if (startIndex !== -1 && endIndexStr !== -1) {
  const absoluteEndIndex = startIndex + endIndexStr;
  
  // Find the // comment start for STEP 3
  let finalEndIndex = absoluteEndIndex;
  while (code[finalEndIndex] !== '/' && finalEndIndex > 0) {
    finalEndIndex--;
  }
  // go one more back if it's a double slash
  if (code[finalEndIndex - 1] === '/') {
      finalEndIndex--;
  }

  const newCode = `const { token, videoPath } = await urlRes.json();

      setProgress("Subiendo video directamente a Supabase...");

      const { error: uploadError } = await supabase.storage
        .from("event_assets")
        .uploadToSignedUrl(videoPath, token, file);

      if (uploadError) {
        console.error("Direct upload error:", uploadError);
        alert("Error al subir el video al almacenamiento.");
        return;
      }

      `;
      
  code = code.substring(0, startIndex) + newCode + code.substring(finalEndIndex);
  fs.writeFileSync('src/app/admin/WelcomeVideoAdmin.tsx', code);
  console.log('Fixed WelcomeVideoAdmin.tsx');
} else {
  console.log('Markers not found');
}
