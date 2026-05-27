// =============================================
// ELEMENTOS DA PÁGINA
// =============================================
const container          = document.querySelector(".container")
const conversaContainer  = document.querySelector(".conversaContainer")
const formulario         = document.querySelector(".formulario")
const campoPergunta      = formulario.querySelector(".inputPergunta")
const inputArquivo       = formulario.querySelector("#arquivoInput")
const areaUpload         = formulario.querySelector(".uparArquivo")

// =============================================
// CONFIGURAÇÃO DA API GEMINI
// =============================================
const CHAVE_API = ''  //AIzaSyCRIB UjRMz4cPUNY2HvJusWu45 9JSrqCCI
const URL_API   = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${CHAVE_API}`

// =============================================
// ESTADO DO CHAT
// =============================================

// Dados do envio atual (mensagem de texto + arquivo opcional)
const dadosEnvio = { mensagem: '', arquivo: null }

// Histórico completo da conversa (enviado à API a cada mensagem)
const historicoChat = []

// =============================================
// FUNÇÕES AUXILIARES
// =============================================

// Cria um elemento de mensagem com as classes passadas
const criarMensagem = (html, ...classes) => {
    const div = document.createElement('div')
    div.classList.add('mensagem', ...classes)
    div.innerHTML = html
    return div
}

// Rola o container até o final automaticamente
const rolarParaBaixo = () =>
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" })

// Efeito de digitação: exibe o texto palavra por palavra
const efetoDigitacao = (texto, elementoTexto, divBot) => {
    elementoTexto.textContent = ''
    const palavras = texto.split(' ')
    let indice = 0

    const intervalo = setInterval(() => {
        if (indice < palavras.length) {
            elementoTexto.textContent += (indice === 0 ? '' : ' ') + palavras[indice++]
            divBot.classList.remove('carregando')
            rolarParaBaixo()
        } else {
            clearInterval(intervalo)
        }
    }, 40)
}

// =============================================
// COMUNICAÇÃO COM A API
// =============================================

const gerarResposta = async (divBot) => {
    const elementoTexto = divBot.querySelector('.mensagemTexto')

    // Monta a mensagem do usuário com texto + arquivo (se houver)
    const partesUsuario = [{ text: dadosEnvio.mensagem }]
    if (dadosEnvio.arquivo) {
        partesUsuario.push({
            inline_data: {
                data: dadosEnvio.arquivo.base64,       // conteúdo do arquivo em base64
                mime_type: dadosEnvio.arquivo.tipoMime // ex: "image/png"
            }
        })
    }

    historicoChat.push({ role: "user", parts: partesUsuario })

    try {
        const resposta = await fetch(URL_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: historicoChat })
        })

        const json = await resposta.json()
        if (!resposta.ok) throw new Error(json.error.message)

        // Remove marcações **negrito** da resposta antes de exibir
        const textoResposta = json.candidates[0].content.parts[0].text
            .replace(/\*\*([^*]+)\*\*/g, "$1")
            .trim()

        efetoDigitacao(textoResposta, elementoTexto, divBot)

        // Salva a resposta no histórico para contexto futuro
        historicoChat.push({ role: "model", parts: [{ text: textoResposta }] })

        // Limpa o arquivo após o envio
        dadosEnvio.arquivo = null

    } catch (erro) {
        elementoTexto.textContent = "Erro ao obter resposta. Tente novamente."
        console.error(erro)
    } finally{
        usuarioDados.file = {}
    }
}

// =============================================
// ENVIO DO FORMULÁRIO
// =============================================

const enviarFormulario = (e) => {
    e.preventDefault()
    const textoUsuario = campoPergunta.value.trim()
    if (!textoUsuario) return

    campoPergunta.value = ''
    dadosEnvio.mensagem = textoUsuario

    // Exibe a mensagem do usuário na tela
    const divUsuario = criarMensagem('<p class="mensagemTexto"></p>', 'usuario')
    divUsuario.querySelector('.mensagemTexto').textContent = textoUsuario
    conversaContainer.appendChild(divUsuario)
    rolarParaBaixo()

    // Após 600ms, exibe o "carregando" e chama a API
    setTimeout(() => {
        const htmlBot = `<img src="gemini.svg" class="avatar"><p class="mensagemTexto">Só um segundo...</p>`
        const divBot  = criarMensagem(htmlBot, 'bot', 'carregando')
        conversaContainer.appendChild(divBot)
        rolarParaBaixo()
        gerarResposta(divBot)
    }, 600)
}

// =============================================
// UPLOAD DE ARQUIVO / IMAGEM
// =============================================

inputArquivo.addEventListener('change', () => {
    const arquivo = inputArquivo.files[0]
    if (!arquivo) return

    const ehImagem = arquivo.type.startsWith('image/')
    const leitor   = new FileReader()
    leitor.readAsDataURL(arquivo)

    leitor.onload = (e) => {
        inputArquivo.value = ''
        const base64 = e.target.result.split(',')[1]

        // Mostra preview na área de upload
        areaUpload.querySelector('.preview').src = e.target.result
        areaUpload.classList.add('active', ehImagem ? 'imgEnviada' : 'arquivoEnviado')

        // Salva os dados do arquivo para incluir no próximo envio
        dadosEnvio.arquivo = {
            nome:     arquivo.name,
            base64:   base64,
            tipoMime: arquivo.type,
            ehImagem: ehImagem
        }
    }
})

// Botão de cancelar upload
document.querySelector('#cancelar').addEventListener('click', () => {
    usuarioDados = {}
    areaUpload.classList.remove('active', 'imgEnviada', 'arquivoEnviado')
    dadosEnvio.arquivo = null
})

// =============================================
// EVENTOS DO FORMULÁRIO
// =============================================
formulario.addEventListener("submit", enviarFormulario)
formulario.querySelector('#arquivo').addEventListener('click', () => inputArquivo.click())