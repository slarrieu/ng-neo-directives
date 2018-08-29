import { Directive, ElementRef, HostListener, Input } from '@angular/core';
@Directive({
    selector: '[onReturn]'
})
export class OnReturnDirective {
    private el: ElementRef;
    @Input() onReturn: any;

    constructor(private _el: ElementRef) {
        this.el = this._el;
    }

    @HostListener('keydown', ['$event']) onKeyDown(e) {
        if ((e.which === 13 || e.keyCode === 13)) {
            e.preventDefault();
            OnReturnDirective.setNextFocus(this.onReturn);
            return;
        }
    }

    public static setNextFocus(onReturn: any): void {
        if (onReturn instanceof Array) {
            let termine = false;
            let i = 0;
            while (!termine && i < onReturn.length) {
                const element = onReturn[i];
                if (element) {
                    if (element instanceof HTMLInputElement ||
                        element instanceof HTMLButtonElement ||
                        element instanceof HTMLSelectElement ||
                        element instanceof HTMLSelectElement) {
                        if (!element.disabled) {
                            element.focus(); termine = true;
                        };
                    } else {
                        if (element && element.nativeElement instanceof HTMLInputElement ||
                            element.nativeElement instanceof HTMLButtonElement ||
                            element.nativeElement instanceof HTMLSelectElement) {
                            if (!element.nativeElement.disabled) {
                                element.nativeElement.focus(); termine = true;
                            }
                        } else {
                            let input = element['ctrInput'];
                            if (input) {
                                input = input['nativeElement'];
                                if (input && input instanceof HTMLInputElement) {
                                    if (!input.disabled) { input.focus(); termine = true; };
                                }
                            }
                        }
                    }
                }
                i++;
            }
        } else if (onReturn) {
            const element = onReturn;
            if (element instanceof HTMLInputElement || element instanceof HTMLButtonElement || element instanceof HTMLSelectElement) {
                if (element.disabled) { 
                    element.disabled = false;
                }
                element.focus(); 
            } else {
                let input = element['ctrInput'];
                if (input) {
                    input = input['nativeElement'];
                    if (input && input instanceof HTMLInputElement) {
                        if (input.disabled) { 
                            input.disabled = false;
                        }
                        input.focus(); 
                    }
                }
            }
        }
    }
}
