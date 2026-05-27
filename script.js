// =============================================
// ELEMENTOS DA PÁGINA
// =============================================
const container         = document.querySelector(".container")
const conversaContainer = document.querySelector(".conversaContainer")
const formulario        = document.querySelector(".formulario")
const campoPergunta     = formulario.querySelector(".inputPergunta")
const inputArquivo      = formulario.querySelector("#arquivoInput")
const areaUpload        = formulario.querySelector(".uparArquivo")
const botaoTema         = document.querySelector("#temas")
const botaoDeletar      = document.querySelector("#deletar")
const sugestoes         = document.querySelectorAll(".sugestoes .item")

// =============================================
// CONFIGURAÇÃO DA API GEMINI
// =============================================
const CHAVE_API = '' //AIzaSyCRI BUjRMz4cPUNY2HvJu sWu459JSrqCCI
const URL_API   = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${CHAVE_API}`

// =============================================
// ESTADO DO CHAT
// =============================================
const dadosEnvio  = { mensagem: '', arquivo: null }
const historicoChat = []

// =============================================
// FUNÇÕES AUXILIARES
// =============================================

const criarMensagem = (html, ...classes) => {
    const div = document.createElement('div')
    div.classList.add('mensagem', ...classes)
    div.innerHTML = html
    return div
}

const rolarParaBaixo = () =>
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" })

// Ativa o modo "conversa" — esconde cabeçalho e sugestões
const ativarConversa = () => container.classList.add('conversa-ativa')


// Efeito de digitação palavra por palavra
const efetoDigitacao = (texto, elementoTexto, divBot) => {
    elementoTexto.innerHTML = ''
    let indice = 0

    const intervalo = setInterval(() => {
        if (indice < texto.length) {
            indice++
            // Atualiza o HTML completo a cada caractere (nunca quebra as tags)
            elementoTexto.innerHTML = texto.slice(0, indice)
            divBot.classList.remove('carregando')
            rolarParaBaixo()
        } else {
            clearInterval(intervalo)
        }
    }, 20) // 20ms por caractere fica mais fluido que 40ms por palavra
}


// =============================================
// COMUNICAÇÃO COM A API
// =============================================

const gerarResposta = async (divBot) => {
    const elementoTexto = divBot.querySelector('.mensagemTexto')

    // Monta as partes da mensagem do usuário
    const partesUsuario = [{ text: dadosEnvio.mensagem }]
    if (dadosEnvio.arquivo) {
        partesUsuario.push({
            inline_data: {
                data:      dadosEnvio.arquivo.base64,
                mime_type: dadosEnvio.arquivo.tipoMime
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

        // Remove marcações **negrito** antes de exibir
        // depois
        const textoResposta = json.candidates[0].content.parts[0].text
            .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")  // **negrito**
            .replace(/\*([^*]+)\*/g, "<em>$1</em>")               // *itálico*
            .replace(/`([^`]+)`/g, "<code>$1</code>")             // `código`
            .trim()

        efetoDigitacao(textoResposta, elementoTexto, divBot)
        historicoChat.push({ role: "model", parts: [{ text: textoResposta }] })

    } catch (erro) {
        elementoTexto.textContent = "Erro ao obter resposta. Tente novamente."
        divBot.classList.remove('carregando')
        console.error(erro)
    } finally {
        // Limpa o arquivo após o envio independente de erro
        dadosEnvio.arquivo = null
        areaUpload.classList.remove('active', 'imgEnviada', 'arquivoEnviado')
        areaUpload.querySelector('.preview').src = ''
        areaUpload.querySelector('.preview').style.display = 'none'
    }
}

// =============================================
// ENVIO DO FORMULÁRIO
// =============================================

const enviarMensagem = (textoUsuario) => {
    if (!textoUsuario) return

    campoPergunta.value = ''
    dadosEnvio.mensagem = textoUsuario

    // Ativa modo conversa (esconde tela inicial)
    ativarConversa()

    // Monta HTML da mensagem do usuário
    // Se tiver imagem, exibe ela acima do texto
    let htmlUsuario = ''
    if (dadosEnvio.arquivo?.ehImagem) {
        htmlUsuario += `<img src="data:${dadosEnvio.arquivo.tipoMime};base64,${dadosEnvio.arquivo.base64}" class="imagemEnviada" alt="imagem enviada">`
    }
    htmlUsuario += `<p class="mensagemTexto">${textoUsuario}</p>`

    const divUsuario = criarMensagem(htmlUsuario, 'usuario')
    conversaContainer.appendChild(divUsuario)
    rolarParaBaixo()

    // Exibe o "carregando" e chama a API após 600ms
    setTimeout(() => {
        const htmlBot = `<img src="gemini.svg" class="avatar"><p class="mensagemTexto">Só um segundo...</p>`
        const divBot  = criarMensagem(htmlBot, 'bot', 'carregando')
        conversaContainer.appendChild(divBot)
        rolarParaBaixo()
        gerarResposta(divBot)
    }, 600)
}

const enviarFormulario = (e) => {
    e.preventDefault()
    const texto = campoPergunta.value.trim()
    if (texto) enviarMensagem(texto)
}

// =============================================
// SUGESTÕES — clique preenche e envia
// =============================================

sugestoes.forEach(item => {
    item.addEventListener('click', () => {
        const texto = item.querySelector('.texto').textContent
        enviarMensagem(texto)
    })
})

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
        const preview = areaUpload.querySelector('.preview')
        preview.src = e.target.result
        preview.style.display = 'block'
        areaUpload.classList.add('active', ehImagem ? 'imgEnviada' : 'arquivoEnviado')

        // Salva para incluir no próximo envio
        dadosEnvio.arquivo = {
            nome:     arquivo.name,
            base64:   base64,
            tipoMime: arquivo.type,
            ehImagem: ehImagem
        }
    }
})

// Cancela o arquivo selecionado
document.querySelector('#cancelar').addEventListener('click', () => {
    areaUpload.classList.remove('active', 'imgEnviada', 'arquivoEnviado')
    const preview = areaUpload.querySelector('.preview')
    preview.src = ''
    preview.style.display = 'none'
    dadosEnvio.arquivo = null
})

// =============================================
// BOTÃO — DELETAR CONVERSA
// =============================================

botaoDeletar.addEventListener('click', () => {

    // Limpa o histórico e a tela
    historicoChat.length = 0
    conversaContainer.innerHTML = ''

    // Volta para a tela inicial
    container.classList.remove('conversa-ativa')
    container.scrollTo({ top: 0, behavior: "smooth" })
})

// =============================================
// BOTÃO — ALTERNAR TEMA CLARO / ESCURO
// =============================================

botaoTema.addEventListener('click', () => {
    const temaAtual = document.documentElement.getAttribute('data-tema')
    const novoTema  = temaAtual === 'escuro' ? 'claro' : 'escuro'

    document.documentElement.setAttribute('data-tema', novoTema)

    // Atualiza o ícone do botão
    botaoTema.textContent = novoTema === 'escuro' ? 'light_mode' : 'dark_mode'
})

// =============================================
// EVENTOS DO FORMULÁRIO
// =============================================
formulario.addEventListener("submit", enviarFormulario)
formulario.querySelector('#arquivo').addEventListener('click', () => inputArquivo.click())
