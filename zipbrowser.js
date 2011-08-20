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
      fileList.children("li").removeClass("current-file");
      listItem.addClass("current-file");
      if (file.type === "binary") {
        return filePreview.html($("<img />", {
          src: "data:image/png;base64," + Crypto.util.bytesToBase64(file.file)
        }));
      } else {
        return filePreview.text(file.file);
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
      var reader;
      reader = new FileReader();
      reader.onload = function(evt) {
        var archive, arrayBuffer;
        fileBrowser.show();
        wrapper.removeClass("no-file");
        arrayBuffer = evt.target.result;
        archive = new CoffeeZip(arrayBuffer, addFile);
        archive.extract();
        return fileList.children().first().click();
      };
      return reader.readAsArrayBuffer(zipFileInput[0].files[0]);
    };
    return zipFileInput.change(function() {
      showBrowser();
      return loadZip();
    });
  });
}).call(this);
