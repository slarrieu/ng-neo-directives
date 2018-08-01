// tslint:disable:indent

import {
	Directive,
	OnInit,
	OnDestroy,
	Input,
	HostListener,
	Renderer,
	ElementRef,
	InjectionToken
} from '@angular/core';
import { Subscription, Observable, Subject, BehaviorSubject } from 'rxjs';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/observable/combineLatest';
import { TimerObservable } from 'rxjs/observable/TimerObservable';

export const COMMAND_CONFIG = new InjectionToken<string>('COMMAND_CONFIG');

export const COMMAND_DEFAULT_CONFIG: CommandOptions = {
	executingCssClass: 'executing',
};

export function provideConfig(config: CommandOptions): any {
	return Object.assign({}, COMMAND_DEFAULT_CONFIG, config);
}


/**
 *
 * ### Example with options
 * ```html
 * <button [command]='saveCmd' [commandOptions]='{executingCssClass: 'in-progress'}'>Save</button>
 * ```
 * @export
 * @class CommandDirective
 * @implements {OnInit}
 * @implements {OnDestroy}
 */
@Directive({
	selector: '[command]'
})
export class CommandDirective implements OnInit, OnDestroy {

	@Input() command: ICommand;
	@Input() commandOptions: CommandOptions;
	@Input() commandCanExecute: boolean;
	@Input() commandValue: any;
	@Input() commandDelay: number;
	// @HostBinding('disabled') isDisabled: boolean;

	private canExecute$$: Subscription;
	private isExecuting$$: Subscription;

	private config: CommandOptions = COMMAND_DEFAULT_CONFIG;

	constructor(
		// @Inject(COMMAND_CONFIG) private config: CommandOptions,
		private renderer: Renderer,
		private element: ElementRef
	) {	}

	ngOnInit() {
		// console.log('[commandDirective::init]');
		this.commandOptions = Object.assign({}, this.config, this.commandOptions);

		if (!this.command) {
			throw new Error('[commandDirective] command should be defined!');
		} else {
			this.command.verifyCommandExecutionPipe();
		}

		this.canExecute$$ = this.command.canExecute$
			.do(x => {
				// console.log('[commandDirective::canExecute$]', x);
				if (this.element.nativeElement.localName === 'button') {
					this.element.nativeElement.disabled = !x;
				}
			}).subscribe();
		this.isExecuting$$ = this.command.isExecuting$
			.do(x => {
				// console.log('[commandDirective::isExecuting$]', x);
				this.renderer.setElementClass(this.element.nativeElement, this.commandOptions.executingCssClass, x);
			}).subscribe();

		if (this.isMobileOperatingSystem()) {
			this.element.nativeElement.addEventListener('touchstart', async (event: MouseEvent) => {
				console.log('[commandDirective::onTouch2]');
				this.command.verifyCommandExecutionPipe();
				this.command.execute(this.commandValue);
			}, {passive: true});
			this.element.nativeElement.addEventListener('focus', async (event) => {
				console.log('[commandDirective::onFocus]');
				this.command.verifyCommandExecutionPipe();
				this.command.execute(this.commandValue);
			}, {passive: true});
			this.element.nativeElement.addEventListener('focusin', async (event) => {
				console.log('[commandDirective::onFocusIn]');
				this.command.verifyCommandExecutionPipe();
				this.command.execute(this.commandValue);
			}, {passive: true});
		} else {
			this.element.nativeElement.addEventListener('click', async (event: MouseEvent) => {
				event.preventDefault();
				console.log('[commandDirective::onClick]');
				this.command.verifyCommandExecutionPipe();
				this.command.execute(this.commandValue);
			});
		}

	}

	ngOnDestroy() {
		// console.log('[commandDirective::destroy]');
		if (this.command) { this.command.destroy(); }
		if (this.canExecute$$) { this.canExecute$$.unsubscribe(); }
		if (this.isExecuting$$) { this.isExecuting$$.unsubscribe(); }
	}

	private isMobileOperatingSystem(): boolean {
		var userAgent = navigator.userAgent || navigator.vendor;
	  
			// Windows Phone must come first because its UA also contains "Android"
		  if (/windows phone/i.test(userAgent)) {
			  return true; // "Windows Phone";
		  }
	  
		  if (/android/i.test(userAgent)) {
			  return true; // "Android";
		  }
	  
		  // iOS detection from: http://stackoverflow.com/a/9039885/177710
		  if (/iPad|iPhone|iPod/.test(userAgent)) {
			  return true; // "iOS";
		  }
	  
		  return false; // "unknown";
	  }
}

export interface CommandOptions {
	/**
	 * Css Class which gets added/removed on the Command element's host while Command isExecuting$.
	 *
	 * @type {string}
	 */
	executingCssClass: string;
}

export interface ICommand {
	/**
	 * Determines whether the command is currently executing.
	 */
	isExecuting: boolean;
	isExecuting$?: Observable<boolean>;
	/**
	 * Determines whether the command can execute or not.
	 */
	canExecute: boolean;
	canExecute$?: Observable<boolean>;
	/**
	 * Execute function to invoke.
	 */
	execute(value?: any): void;

	/**
	 * Execute function to invoke and return a result in Promise.
	 */
	executeWithResult(value?: any): Promise<any>;
	/**
	 * Disposes all resources held by subscriptions.
	 */
	destroy(): void;

	verifyCommandExecutionPipe();
}


/**
 * Command object used to encapsulate information which is needed to perform an action.
 *
 * @export
 * @class Command
 * @implements {ICommand}
 */
export class Command implements ICommand {

	isExecuting = false;
	isExecuting$ = new BehaviorSubject<boolean>(false);
	canExecute = true;
	canExecute$: Observable<boolean>;

	private executionPipe$ = new Subject<{}>();
	private isExecuting$$: Subscription;
	private canExecute$$: Subscription;
	private executionPipe$$: Subscription;

	public result: Promise<any>;

	/**
	 * Creates an instance of Command.
	 *
	 * @param {(() => any)} executeParam Execute function to invoke - use `isAsync: true` when {Observable<any>}.
	 * @param {Observable<boolean>} [canExecute] Observable which determines whether it can execute or not.
	 * @param {boolean} [isAsync] Indicates that the execute function is async e.g. Observable.
	 * @param {number} [delay] Indicates that the execute function is dealy by given milliseconds.
	 */
	constructor(
		private executeParam: (any?) => any,
		canExecute$?: Observable<boolean>,
		private isAsync?: boolean,
		private delay?: number
	) {
		if (canExecute$) {
			this.canExecute$ = Observable.combineLatest(
				this.isExecuting$,
				canExecute$
				, (isExecuting, canExecuteResult) => {
					// console.log('[command::combineLatest$] update!', { isExecuting, canExecuteResult });
					this.isExecuting = isExecuting;
					this.canExecute = !isExecuting && canExecuteResult;
					return this.canExecute;
				});
			this.canExecute$$ = this.canExecute$.subscribe();
		} else {
			this.canExecute$ = this.isExecuting$.map(x => {
				const canExecute = !x;
				this.canExecute = canExecute;
				return canExecute;
			});
			this.isExecuting$$ = this.isExecuting$
				.do(x => this.isExecuting = x)
				.subscribe();
		}
		this.buildExecutionPipe(executeParam, isAsync, delay);
	}

	public verifyCommandExecutionPipe() {
		if (this.executionPipe$.observers.length === 0) {
			this.buildExecutionPipe(this.executeParam, this.isAsync, this.delay);
		}
	}

	execute(value?: any) {
		this.executionPipe$.next(value);
	}

	async executeWithResult(value?: any): Promise<any> {
		this.executionPipe$.next(value);
		return await this.result;
	}

	destroy() {
		if (this.executionPipe$$) {
			this.executionPipe$$.unsubscribe();
		}
		if (this.canExecute$$) {
			this.canExecute$$.unsubscribe();
		}
		if (this.isExecuting$$) {
			this.isExecuting$$.unsubscribe();
		}
		if (this.isExecuting$) {
			this.isExecuting$.complete();
		}
	}

	private delaySubscribe: Subscription;

	private buildExecutionPipe(executeParm: (any?) => any, isAsync?: boolean, delay?: number) {
		let pipe$ = this.executionPipe$
			.filter(() => this.canExecute)
			.do(() => {
				// console.log('[command::excutionPipe$] do#1 - set execute');
				this.isExecuting$.next(true);
			});

		pipe$ = isAsync
			? pipe$.switchMap((value) => { 
				if (delay && delay > 0) {
					if (this.delaySubscribe) this.delaySubscribe.unsubscribe();
					const timer = Observable.timer(delay) as TimerObservable;
					this.delaySubscribe = timer.subscribe(t => executeParm(value));
					return Promise.resolve(null);
				} else { 		
					return executeParm(value); 
				} 
			})
			: pipe$.do((value) => executeParm(value));

		pipe$ = pipe$
			.do(() => {
				// console.log('[command::excutionPipe$] do#2 - set idle');
				this.isExecuting$.next(false);
			},
				(e) => {
					console.log('[command::excutionPipe$] do#2 error - set idle' + e.toString());
					this.isExecuting$.next(false);
					this.buildExecutionPipe(executeParm, isAsync, delay);
				});
		this.executionPipe$$ = pipe$.subscribe();
	}

}
