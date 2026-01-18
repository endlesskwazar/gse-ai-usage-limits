import Gettext from 'gettext';

const Domain = 'gse-ai-usage-limits';
const _ = Gettext.gettext;
const ngettext = Gettext.ngettext;
const pgettext = Gettext.pgettext;

export function init(extension) {
    const localeDir = extension.dir.get_child('locale');
    Gettext.bindtextdomain(Domain, localeDir.get_path());
    Gettext.textdomain(Domain);
}

export { _ as gettext, ngettext, pgettext, Domain };
