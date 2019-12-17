export class Url {
    url: string;
    constructor(url: string) {
        let httpRegex = "^http.*";
        if (url.match(httpRegex)) {
            this.url = url;
        } else {
            this.url = "http://" + url;
        }
    }
}