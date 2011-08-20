$(->
	
	fileInput = $("#file-input")
	zipForm = fileInput.find("form")
	zipFileInput = zipForm.find("input[type='file']")
	fileBrowser = $("#file-browser")
	fileListPanel = $("#file-list-panel")
	fileList = $("#file-list")
	filePreviewPanel = $("#file-preview-panel")
	filePreview = $("#file-preview")
	wrapper = $("#wrapper")
	
	previewFile = (file, listItem) ->
		fileList.children("li").removeClass("current-file")
		listItem.addClass("current-file")
		
		if file.type is "binary"
			filePreview.html($("<img />", src: "data:image/png;base64," + Crypto.util.bytesToBase64(file.file)))
		else
			filePreview.text(file.file)
			
	addFile =	(file) ->
		if file.type isnt "folder"
			fileList.append(
				$("<li />",
					click: -> previewFile(file, $(@))
					text: file.filename
				)
			)
			
	showBrowser = ->
		fileInput.addClass("file-loading")
		filePreview.html("")
		fileList.html("")
		
	loadZip = ->
		reader = new FileReader()
		reader.onload = (evt) ->
			fileBrowser.show()
			wrapper.removeClass("no-file")
			arrayBuffer = evt.target.result
			archive = new CoffeeZip(arrayBuffer, addFile)
			archive.extract()
			fileList.children().first().click()
		reader.readAsArrayBuffer(zipFileInput[0].files[0])
		
			
	zipFileInput.change(->
		showBrowser()
		loadZip()
	)
)