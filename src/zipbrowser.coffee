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
		extension = (filenameParts = file.filename.split("."))[filenameParts.length - 1]
		if file.type is "binary"
			if extension in ["png", "jpg", "jpeg", "gif", "bmp"]
				filePreview.html($("<img />", src: "data:image/#{ extension };base64," + Crypto.util.bytesToBase64(file.file)))
			else
				filePreview.html("<i>Binary file</i>.")
		else
			if extension in ["html", "htm", "xhtml", "xml", "opf"]
				filePreview.html(
					$("<iframe />",
						src: "data:text/html;charset=utf-8;base64," + Crypto.util.bytesToBase64(Crypto.charenc.UTF8.stringToBytes(file.file))
					)
				)
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
		filename = (filePathParts = zipFileInput.attr("value").split("/"))[filePathParts.length - 1]
		reader = new FileReader()
		reader.onload = (evt) ->
			fileBrowser.show()
			wrapper.removeClass("no-file")
			$("title").text("ZipBrowser :: Browsing #{ filename }")
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