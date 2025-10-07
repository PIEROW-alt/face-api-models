const video = document.getElementById('video');
const statusDiv = document.getElementById('status');

// Función para acceder a la cámara
function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: {} })
        .then(stream => {
            video.srcObject = stream;
            statusDiv.textContent = 'Cámara activa - Detectando rostros...';
        })
        .catch(err => {
            console.error('Error al acceder a la cámara:', err);
            statusDiv.textContent = 'Error: No se pudo acceder a la cámara';
        });
}

// Cargar modelos desde GitHub (CDN)
async function loadModels() {
    statusDiv.textContent = 'Cargando modelos de IA... (puede tardar un poco)';
    
    const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
    
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
            faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
        ]);
        
        statusDiv.textContent = 'Modelos cargados exitosamente - Iniciando cámara...';
        startVideo();
    } catch (err) {
        console.error('Error completo:', err);
        statusDiv.textContent = 'Error al cargar modelos: ' + err.message;
    }
}

// Función para dibujar texto con fondo mejorado
function drawTextWithBackground(ctx, text, x, y, fontSize = 16) {
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;
    
    // Fondo negro semi-transparente
    ctx.fillRect(x - 5, y - textHeight, textWidth + 10, textHeight + 8);
    
    // Texto blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x, y);
}

// Procesamiento en tiempo real
video.addEventListener('play', () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);
    
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);
    
    setInterval(async () => {
        const detections = await faceapi
            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceExpressions()
            .withAgeAndGender();
        
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        
        const ctx = canvas.getContext('2d');
        
        // Limpiar el canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Dibujar detecciones básicas
        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        
        // Para cada rostro detectado, mostrar información organizada
        resizedDetections.forEach(detection => {
            const { age, gender, genderProbability, expressions } = detection;
            const box = detection.detection.box;
            
            // Posición inicial debajo de la caja del rostro
            let textY = box.bottomLeft.y + 25;
            const textX = box.bottomLeft.x;
            
            // 1. EDAD (primera línea)
            const ageText = `Edad: ${Math.round(age)} años`;
            drawTextWithBackground(ctx, ageText, textX, textY, 18);
            textY += 30;
            
            // 2. GÉNERO (segunda línea)
            const genderText = `Género: ${gender === 'male' ? 'Masculino' : 'Femenino'} (${Math.round(genderProbability * 100)}%)`;
            drawTextWithBackground(ctx, genderText, textX, textY, 18);
            textY += 35;
            
            // 3. EXPRESIONES (líneas siguientes)
            // Obtener la expresión dominante
            const expressionEntries = Object.entries(expressions);
            const sortedExpressions = expressionEntries.sort((a, b) => b[1] - a[1]);
            
            // Traducción de expresiones
            const expressionNames = {
                neutral: 'Neutral',
                happy: 'Feliz',
                sad: 'Triste',
                angry: 'Enojado',
                fearful: 'Asustado',
                disgusted: 'Disgustado',
                surprised: 'Sorprendido'
            };
            
            // Mostrar título de expresiones
            drawTextWithBackground(ctx, 'Expresiones:', textX, textY, 16);
            textY += 25;
            
            // Mostrar las 3 expresiones más probables
            for (let i = 0; i < 3; i++) {
                const [expression, probability] = sortedExpressions[i];
                const expressionText = `  ${expressionNames[expression]}: ${Math.round(probability * 100)}%`;
                drawTextWithBackground(ctx, expressionText, textX, textY, 14);
                textY += 22;
            }
        });
        
    }, 100);
});

// Iniciar cuando la página cargue
window.addEventListener('load', () => {
    console.log('Página cargada, iniciando carga de modelos...');
    loadModels();
});