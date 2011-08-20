$(->
	
	fileInput = $("#file-input")
	zipForm = fileInput.find("form")
	zipFileInput = zipForm.find("input[type='file']")
	fileBrowser = $("#file-browser")
	fileListPanel = $("#file-list-panel")
	fileList = $("#file-list")
	filePreviewPanel = $("#file-preview-panel")
	filePreview = $("#file-preview")
	
	previewFile = (file, listItem) ->
		console.log listItem
		fileList.children("li").removeClass("current-file")
		listItem.addClass("current-file")
		
		if file.type is "binary"
			filePreview.html($("<img />", src: "data:image/png;base64," + Crypto.util.bytesToBase64(file.file)))
		else
			filePreview.text(file.file)
			
	zipFileInput.change(-> zipForm.submit())
	zipForm.bind("submit", (evt) ->
		fileInput.addClass("file-loading")
		filePreview.html("")
		fileList.html("")
		reader = new FileReader()
		iterator = (file) ->
			if file.type isnt "folder"
				$("#file-list").append(
					$("<li />",
						click: -> previewFile(file, $(@))
						text: file.filename
					)
				)
		evt.preventDefault()
		evt.stopPropagation()
		reader.onload = (evt) ->
			fileBrowser.show()
			fileInput.removeClass("no-file")
			fileInput.removeClass("file-loading")
			arrayBuffer = evt.target.result
			archive = new CoffeeZip(arrayBuffer, iterator)
			archive.extract()
		reader.readAsArrayBuffer(zipFileInput[0].files[0])
	)
)