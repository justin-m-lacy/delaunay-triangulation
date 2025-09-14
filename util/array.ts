export const quickSplice = <T>(a: T[], i: number) => {

	a[i] = a[a.length - 1];
	a.pop();

}