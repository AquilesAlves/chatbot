const container = document.querySelector(".container")
const conversaContainer = document.querySelector(".conversaContainer")
const formulario = document.querySelector(".formulario")
const inputPergunta = formulario.querySelector(".inputPergunta")

//const API_KEY = 'AIzaSyA-O7_sNOVXhIrxo60o6HSfjFjiOsXpGHY'
//const API_KEY = 'AIzaSyCoBZVVPXKdRBhP5VPXLh-jVy14GmURJ54'
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${API_KEY}`

let mensagemUsuario = ""
const chatHistorico = []

const criaMensagem = (content, ...classes) => {
    const div = document.createElement('div')
    div.classList.add('mensagem', ...classes)
    div.innerHTML = content
    return div
}

const scrollAutomatico = () => container.scrollTo({ top: container.scrollHeight, behavior: "smooth"})


const digitandoEfeito = (text, textoElemento, msgBotDiv) => {
    textoElemento.textContent = ''
    const palavras = text.split(' ')
    let palavraIndex = 0

    const digitandoIntervalo = setInterval(() => {
        if (palavraIndex < palavras.lenght) {
            textoElemento.textContent += (palavraIndex === 0 ? "" : " ") + palavras[palavraIndex++]
            msgBotDiv.classList.remove('carregando')
            scrollAutomatico()
        } else {
            clearInterval(digitandoIntervalo)
        }
    }, 40);

}

const gerarResposta = async (msgBotDiv) => {
    const textoElemento = msgBotDiv.querySelector('.mensagemTexto')


    chatHistorico.push({
        role: "user",
        parts: [{ text: mensagemUsuario}]
    })


    try {
        const resposta = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json"},
            body: JSON.stringify({contents: chatHistorico})
        })

        const dados = await resposta.json()
        if(!resposta.ok) throw new Error(dados.error.message)

        const respostaTexto = dados.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim()
        digitandoEfeito(respostaTexto, textoElemento, msgBotDiv)
        chatHistorico.push({
            role: "model",
            parts: [{ text: respostaTexto}]
        })
    } catch (error) {
        console.log(error)
    }
}


const enviaFormulario = (e) => {
    e.preventDefault()
    mensagemUsuario = inputPergunta.value.trim()
    if(!mensagemUsuario) return

    inputPergunta.value = ''

    const msgUsuarioHtml = '<p class="mensagemTexto"></p>'
    const msgUsuarioDiv = criaMensagem(msgUsuarioHtml, 'usuario')

    msgUsuarioDiv.querySelector('.mensagemTexto').textContent = mensagemUsuario
    conversaContainer.appendChild(msgUsuarioDiv)
    scrollAutomatico()

    setTimeout(() => {
        const msgBotHtml = `<img src="gemini.svg" class="avatar"><p class="mensagemTexto">Só um segundo...</p>`
        const msgBotDiv = criaMensagem(msgBotHtml, 'bot', 'carregando')
        conversaContainer.appendChild(msgBotDiv)
        scrollAutomatico()
        gerarResposta(msgBotDiv)
    }, 600);
}

formulario.addEventListener("submit", enviaFormulario)