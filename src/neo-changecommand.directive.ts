import { Directive, Input, Renderer, ElementRef, HostListener } from '@angular/core';
import { ICommand } from './ng2-command/command.directive';


@Directive({
    selector: '[changeCommand]'
})
export class NeoChangeCommandDirective {
    @Input() changeCommand: ICommand;

    private _lastValue: string;

    constructor(private element: ElementRef) {
    }

    @HostListener('window:keyup', ['$event']) onInputChange(event: KeyboardEvent) {
        const value = this.element.nativeElement.value;

        if (!this._lastValue || this._lastValue !== value) {
            this._lastValue = value;
            this.changeCommand.execute(value);
        }
    }
}
