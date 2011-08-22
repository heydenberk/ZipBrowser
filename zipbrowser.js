(function() {
  $(function() {
    var addFile, fileBrowser, fileInput, fileList, fileListPanel, filePreview, filePreviewPanel, loadZip, previewFile, showBrowser, wrapper, zipFileInput, zipForm;
    fileInput = $("#file-input");
    zipForm = fileInput.find("form");
    zipFileInput = zipForm.find("input[type='file']");
    fileBrowser = $("#file-browser");
    fileListPanel = $("#file-list-panel");
    fileList = $("#file-list");
    filePreviewPanel = $("#file-preview-panel");
    filePreview = $("#file-preview");
    wrapper = $("#wrapper");
    previewFile = function(file, listItem) {
      var extension, filenameParts;
      fileList.children("li").removeClass("current-file");
      listItem.addClass("current-file");
      extension = (filenameParts = file.filename.split("."))[filenameParts.length - 1];
      if (file.type === "binary") {
        if (extension === "png" || extension === "jpg" || extension === "jpeg" || extension === "gif" || extension === "bmp") {
          return filePreview.html($("<img />", {
            src: ("data:image/" + extension + ";base64,") + Crypto.util.bytesToBase64(file.file)
          }));
        } else {
          return filePreview.html("<i>Binary file</i>.");
        }
      } else {
        if (extension === "html" || extension === "htm" || extension === "xhtml" || extension === "xml" || extension === "opf") {
          return filePreview.html($("<iframe />", {
            src: "data:text/html;charset=utf-8;base64," + Crypto.util.bytesToBase64(Crypto.charenc.UTF8.stringToBytes(file.file))
          }));
        } else {
          return filePreview.text(file.file);
        }
      }
    };
    addFile = function(file) {
      if (file.type !== "folder") {
        return fileList.append($("<li />", {
          click: function() {
            return previewFile(file, $(this));
          },
          text: file.filename
        }));
      }
    };
    showBrowser = function() {
      fileInput.addClass("file-loading");
      filePreview.html("");
      return fileList.html("");
    };
    loadZip = function() {
      var filePathParts, filename, reader;
      reader = new FileReader();
      reader.onload = function(evt) {
        var archive, arrayBuffer;
        fileBrowser.show();
        wrapper.removeClass("no-file");
        $("title").text();
        arrayBuffer = evt.target.result;
        archive = new CoffeeZip(arrayBuffer, addFile);
        archive.extract();
        return fileList.children().first().click();
      };
      filename = (filePathParts = zipFileInput.attr("value").split("/"))[filePathParts.length - 1];
      return reader.readAsArrayBuffer(zipFileInput[0].files[0]);
    };
    return zipFileInput.change(function() {
      showBrowser();
      return loadZip();
    });
  });
}).call(this);
