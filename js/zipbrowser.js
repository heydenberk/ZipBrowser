$(function() {
	
	var FileInput = Backbone.Model.extend({
		
		initialize: function() {
			var self = this;
			this.bind("change:file", function() {
				self.read();
			});
		},
		
		loading: false,
		
		read: function() {
			var reader = new FileReader();
			var self = this;
			reader.onload = function(evt) {
				self.set({ filedata: evt.target.result });
			};
			reader.readAsArrayBuffer(this.get("file"));
		}
		
	});
	
	var FileInputView = Backbone.View.extend({
		
		events: {
			"change" : "change"
		},
		
		change: function() {
			this.model.set({ file: this.$("input[type=file]")[0].files[0] });
			this.model.set({ loading: true });
		},
		
		initialize: function() {
			var self = this;
			this.model.bind("change:loading", function() { self.render(); });
		},
		
		model: FileInput,
		
		render: function() {
			if (this.model.get("loading")) {
				$(this.el).addClass("file-loading");
			} else {
				$(this.el).removeClass("file-loading");
			}
		}
	});
	
	var File = Backbone.Model.extend({
		
		current: false,
		
		bytes: function() {
			if (typeof this.get("file") === "string") {
				return Crypto.charenc.UTF8.stringToBytes(this.get("file"));
			}
			return this.get("file");
		},
		
		dataURL: function(encodings) {
			encodings = encodings || [];
			return "data:" + this.type() + "/" + this.extension() + ";" + encodings.join(";") + ";base64," + Crypto.util.bytesToBase64(this.bytes());
		},
		
		extension: function() {
			var filenameParts = this.get("filename").split(".");
			return filenameParts[filenameParts.length - 1];
		},
		
		type: function() {
			if (["png", "jpg", "jpeg", "gif", "bmp"].indexOf(this.extension()) !== -1) {
				return "image";
			} else if (["html", "htm", "xhtml", "xml", "opf", "css", "js"].indexOf(this.extension()) !== -1) {
				return "text";
			}
			return "application";
		}
		
	});
	
	var FileList = Backbone.Collection.extend({
		
		changeCurrent: function(currentFile) {
			if (!currentFile.attributes.current) return;
			this.each(function(file) {
				if (file.cid !== currentFile.cid) {
					file.set({ current: false });
				}
			});
		},
		
		initialize: function() {
			var self = this;
			this.bind("change:current", function(currentFile) {
				self.changeCurrent(currentFile);
				$(self.preview).html(currentFile.attributes.content);
			});
		},
		
		model: File
		
	});
	
	var FileListView = Backbone.View.extend({
		
		initialize: function() {
			var self = this;
			this.collection.bind("add", function(file) {
				var fileView = new FileView({
					model: file
				});
				$(self.el).append(fileView.render());
			});
			
			this.collection.bind("remove", function(file) {
				self.$("[data-cid]=" + file.cid).remove();
			});
		}
		
	})
	
	var FileView = Backbone.View.extend({
		
		initialize: function() {
			var self = this;
			this.model.bind("change:current", function() { self.render(); });
		},
		
		tagName: "li",
		
		events: {
			"click": "display" 
		},
		
		previewHtml: function() {
			if (this.model.type() === "image") {
				return this.renderImage();
			} else if (this.model.type() === "text") {
				return this.renderText();
			} else {
				return "<span style='font-style: italic;'>Unknown file type.</span>"
			}
		},
		
		render: function(cid) {
			$(this.el).text(this.model.get("filename"));
			$(this.el).attr("data-cid", cid);
			if (this.model.get("current")) {
				$(this.el).addClass("current-file");
			} else {
				$(this.el).removeClass("current-file");
			}
			return this.el;
		},
		
		renderImage: function() {
			return $("<img />", {
				src: this.model.dataURL()
			});
		},
		
		renderText: function() {
			var self = this;
			return $("<a />", {
				text: "View as live document",
				href: "javascript: void 0",
				click: function() {
					window.open(self.model.dataURL("charset=utf-8")); 
				}
			}).add(
				$("<pre />", {
					html: $("<code />", {
						html: hljs.highlightAuto(this.model.get("file")).value
					})
				})
			);
		},
		
		display: function() {
			this.model.set({ content: this.previewHtml() });
			this.model.set({ current: true });
			this.render();
		}
		
	});
	
	var AppView = Backbone.View.extend({
		
		initialize: function() {
			this.render();
		},
		
		model: App,
		
		render: function() {
			$(this.el).parent().removeClass("no-file");
			$(this.el).show();
		}
		
	});
	
	var App = Backbone.Model.extend({
		
		addFile: function(file) {
			if (file.type !== "folder") {
				this.collection.add(new File(file));
			}
		},
		
		createView: function() {
			var appView = new AppView({
				el: $("#file-browser"),
				model: this
			});
		},
		
		createFileList: function() {
			var fileListView = new FileListView({
				collection: this.collection,
				el: $("#file-list")[0]
			});
		},
		
		initialize: function() {
			var self = this;
			this.collection = new FileList();
			this.collection.preview = this.get("preview");
			this.fileInput = new FileInput();
			this.fileInputView = new FileInputView({ el: this.get("input"),  model: this.fileInput });

			this.fileInput.bind("change:filedata", function() {
				self.createView();
				self.createFileList();
				self.collection.reset();
				self.readZipFile();
				self.collection.first().set({ current: true });
			});
		},
		
		readZipFile: function() {
			var self = this;
			var archive = new CoffeeZip(self.fileInput.get("filedata"), function(file) {
				self.addFile(file);
			});
			archive.extract();
		}
		
	})
	
	var app = new App({ 
		input: $("#file-input")[0],
		list: $("#file-list")[0],
		preview: $("#file-preview")[0]
	});

});
