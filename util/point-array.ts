/**
 * Creates a point array of floating point numbers.
 * @param n 
 */
export const pointArray = (n: number) => {

	const f = new Float32Array(n);

	return new Proxy(f, {

		get(targ, p) {

			/// trap for wrapper keys.
			if (Reflect.has(this, p)) {
				return Reflect.get(this, p);
			}

			return Reflect.get(targ, p)
		},

		deleteProperty(targ: any, p) {

			if (!Number.isNaN(Number(p))) {

				const elm = Reflect.get(targ, p);
				if (!Reflect.deleteProperty(targ, p)) return false;

				/// target might just be shifted because of
				/// a delete at a lower index.
				if (elm !== undefined) {
					this.onRemove!(elm);
				}
				return true;
			}

			return Reflect.deleteProperty(targ, p);

		},

		set(targ: any, p, value, rec) {

			if (Number.isNaN(Number(p))) {

				return Reflect.set(targ, p, value, rec);

			} else {

				const prev = Reflect.get(targ, p);
				if (value !== prev) {

					/// check if the value is new before setting value.
					/// !!TODO: doens't work for arrays allowing multiple copies,
					/// but might be wanted for position changes?
					/// const newVal = !targ.includes(value);

					/// check if internal setter succeeds before triggering.
					if (!Reflect.set(targ, p, value, rec)) return false;

					// confirm previous value is really gone.
					// !! again. doesn't work for arrays allowing multiple copies.
					if (prev !== undefined) this.onRemove!(prev);

				}
			}
			return true;

		},


	});
}