const formulario = document.querySelector(".formulario")
const inputPergunta = formulario.querySelector(".inputPergunta")

let mensagemUsuario = ""

const handleFormSubmit = (e) => {
    e.preventDefault()
    mensagemUsuario = inputPergunta.value.trim()
    if(!mensagemUsuario) return

    console.log(mensagemUsuario)
}

formulario.addEventListener("submit", handleFormSubmit)