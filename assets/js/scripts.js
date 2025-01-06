// Configuración de AWS
const REGION = "us-east-1";
const IDENTITY_POOL_ID = "us-east-1:cf536ea0-e28e-4f75-9a77-274ac8bd7bac";
const SNS_TOPIC_ARN = "arn:aws:sns:us-east-1:183295419448:ContactFormNicoCastro";

// Configurar AWS SDK
AWS.config.region = REGION;
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: IDENTITY_POOL_ID
});

// Crear el cliente SNS
const sns = new AWS.SNS();

// Función para enviar el mensaje a SNS
function sendMessageToSNS(name, email, message) {
    const params = {
        Message: `Nuevo mensaje desde el formulario de contacto de tu sitio web:\nNombre: ${name}\nEmail: ${email}\nMensaje: ${message}`,
        TopicArn: SNS_TOPIC_ARN
    };

    return new Promise((resolve, reject) => {
        sns.publish(params, function(err, data) {
            if (err) {
                console.error("Error al enviar el mensaje:", err);
                reject(err);
            } else {
                console.log("Mensaje enviado con éxito:", data.MessageId);
                resolve(data);
            }
        });
    });
}

// Función para validar el formulario
function validateForm(name, email, message) {
    if (!name || !email || !message) {
        showMessage("Por favor, rellena todos los campos.", "error");
        return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
        showMessage("Por favor, introduce un email válido.", "error");
        return false;
    }
    return true;
}

// Función para mostrar mensajes
function showMessage(text, type) {
    const alertMsg = document.querySelector('.alert-msg');
    alertMsg.textContent = text;
    alertMsg.className = 'alert-msg mt-3 alert ' + (type === 'error' ? 'alert-danger' : 'alert-success');
    alertMsg.style.display = 'block';
}

// Implementar rate limiting
const RATE_LIMIT = 3; // Número máximo de envíos permitidos
const TIME_WINDOW = 3600000; // Ventana de tiempo en milisegundos (1 hora)

function checkRateLimit() {
    const now = Date.now();
    let rateData = JSON.parse(localStorage.getItem('rateLimitData')) || { count: 0, timestamp: now };

    if (now - rateData.timestamp > TIME_WINDOW) {
        rateData = { count: 0, timestamp: now };
    }

    if (rateData.count >= RATE_LIMIT) {
        showMessage("Has excedido el límite de envíos. Por favor, inténtalo más tarde.", "error");
        return false;
    }

    rateData.count++;
    localStorage.setItem('rateLimitData', JSON.stringify(rateData));
    return true;
}

// Manejar el envío del formulario
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('myForm');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!checkRateLimit()) {
            return;
        }

        const name = this.querySelector('input[name="name"]').value.trim();
        const email = this.querySelector('input[name="email"]').value.trim();
        const message = this.querySelector('textarea[name="message"]').value.trim();

        if (!validateForm(name, email, message)) {
            return;
        }

        const submitButton = this.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Enviando...';

        try {
            await sendMessageToSNS(name, email, message);
            showMessage("Tu mensaje ha sido enviado con éxito. Gracias!", "success");
            this.reset();
        } catch (error) {
            showMessage("Hubo un error al enviar el mensaje. Por favor, inténtalo de nuevo más tarde.", "error");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Enviar';
        }
    });
});